'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { parse } = require('json2csv');

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  /**
   * Get all media orders (DVD and digital downloads)
   */
  async getMediaOrders(ctx) {
    try {
      // Find all orders that have DVD or digital downloads
      const orders = await strapi.db.query('api::order.order').findMany({
        where: {
          $or: [
            { dvd_count: { $gt: 0 } },
            { digital_download_count: { $gt: 0 } }
          ]
        },
        populate: {
          users_permissions_user: true
        },
      });

      // Separate orders into DVD and digital download orders
      const dvdOrders = [];
      const digitalOrders = [];

      orders.forEach(order => {
        const orderData = {
          id: order.id,
          name: order.users_permissions_user ?
                `${order.users_permissions_user.first_name || ''} ${order.users_permissions_user.last_name || ''}`.trim() ||
                order.users_permissions_user.email :
                'Unknown',
          email: order.users_permissions_user ? order.users_permissions_user.email : 'Unknown',
          orderDate: order.createdAt || new Date(),
          status: order.media_status || 'pending',
          notes: order.media_notes || ''
        };

        if (order.dvd_count > 0) {
          dvdOrders.push({
            ...orderData,
            dvdCount: order.dvd_count
          });
        }

        if (order.digital_download_count > 0 || (order.media_type === 'digital' || order.media_type === 'both')) {
          digitalOrders.push({
            ...orderData,
            accessCode: order.access_code || null,
            accessCodeEmailed: order.access_code_emailed || false,
            digitalCount: order.digital_download_count || 1
          });
        }
      });

      // Return the separated orders
      return { dvdOrders, digitalOrders };
    } catch (error) {
      console.error('Error fetching media orders:', error);
      ctx.throw(500, 'An error occurred while fetching media orders');
    }
  },

  /**
   * Update order status
   */
  async updateOrderStatus(ctx) {
    try {
      const { id } = ctx.params;
      const { status, notes } = ctx.request.body;

      // Update the order status
      const updatedOrder = await strapi.entityService.update('api::order.order', id, {
        data: {
          media_status: status,
          media_notes: notes
        }
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      ctx.throw(500, 'An error occurred while updating order status');
    }
  },

  /**
   * Generate access code for a digital download
   */
  async generateAccessCode(ctx) {
    try {
      const { id } = ctx.params;

      // Generate a unique access code
      const accessCode = `DVL-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`;

      // Update the order with the access code
      const updatedOrder = await strapi.entityService.update('api::order.order', id, {
        data: {
          access_code: accessCode
        }
      });

      return { accessCode };
    } catch (error) {
      console.error('Error generating access code:', error);
      ctx.throw(500, 'An error occurred while generating access code');
    }
  },

  /**
   * Generate access codes in bulk for all orders without codes
   */
  async generateBulkAccessCodes(ctx) {
    try {
      // Find all digital orders without access codes
      const orders = await strapi.db.query('api::order.order').findMany({
        where: {
          $or: [
            { digital_download_count: { $gt: 0 } },
            { media_type: { $in: ['digital', 'both'] } }
          ],
          access_code: null
        }
      });

      // Generate and update access codes
      const updatePromises = orders.map(async (order) => {
        const accessCode = `DVL-${new Date().getFullYear()}-${String(order.id).padStart(4, '0')}`;
        return strapi.entityService.update('api::order.order', order.id, {
          data: {
            access_code: accessCode
          }
        });
      });

      await Promise.all(updatePromises);

      return { success: true, count: orders.length };
    } catch (error) {
      console.error('Error generating bulk access codes:', error);
      ctx.throw(500, 'An error occurred while generating bulk access codes');
    }
  },

  /**
   * Send status email to customer
   */
  async sendStatusEmail(ctx) {
    try {
      const { orderId, subject, message, includeAccessCode } = ctx.request.body;

      // Fetch the order with user details
      const order = await strapi.entityService.findOne('api::order.order', orderId, {
        populate: ['users_permissions_user']
      });

      if (!order || !order.users_permissions_user) {
        return ctx.badRequest('Order or user not found');
      }

      const userEmail = order.users_permissions_user.email;

      // Prepare email content
      let emailMessage = message;

      // Include access code if requested and available
      if (includeAccessCode && order.access_code) {
        if (!emailMessage.includes(order.access_code)) {
          emailMessage += `\n\nYour access code is: ${order.access_code}`;
        }

        // Mark access code as emailed
        await strapi.entityService.update('api::order.order', orderId, {
          data: {
            access_code_emailed: true
          }
        });
      }

      // Send email using Mailgun
      const mailgun = require('mailgun-js')({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
      });

      const mailData = {
        from: process.env.MAIL_FROM_ADDRESS,
        to: userEmail,
        subject: subject,
        text: emailMessage
      };

      await mailgun.messages().send(mailData);

      return { success: true };
    } catch (error) {
      console.error('Error sending status email:', error);
      ctx.throw(500, 'An error occurred while sending the status email');
    }
  },

  /**
   * Send bulk status emails
   */
  async sendBulkStatusEmails(ctx) {
    try {
      const { targetOrders, targetStatus, subject, message } = ctx.request.body;

      // Build the query to find the relevant orders
      const query = {
        populate: ['users_permissions_user'],
        where: {}
      };

      if (targetOrders === 'dvd') {
        query.where.dvd_count = { $gt: 0 };
      } else if (targetOrders === 'digital') {
        query.where.$or = [
          { digital_download_count: { $gt: 0 } },
          { media_type: { $in: ['digital', 'both'] } }
        ];
      }

      if (targetStatus) {
        query.where.media_status = targetStatus;
      }

      // Find the orders
      const orders = await strapi.db.query('api::order.order').findMany(query);

      // Send emails to each user
      const mailgun = require('mailgun-js')({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
      });

      const emailPromises = orders.map(async (order) => {
        if (!order.users_permissions_user || !order.users_permissions_user.email) {
          return null;
        }

        // Prepare email content
        let emailMessage = message;

        // Include access code if this is a digital order and has an access code
        if (targetOrders === 'digital' && order.access_code) {
          if (!emailMessage.includes('access code')) {
            emailMessage += `\n\nYour access code is: ${order.access_code}`;
          }

          // Mark access code as emailed
          await strapi.entityService.update('api::order.order', order.id, {
            data: {
              access_code_emailed: true
            }
          });
        }

        const mailData = {
          from: process.env.MAIL_FROM_ADDRESS,
          to: order.users_permissions_user.email,
          subject: subject,
          text: emailMessage
        };

        return mailgun.messages().send(mailData);
      });

      await Promise.all(emailPromises.filter(Boolean));

      return { success: true, count: emailPromises.filter(Boolean).length };
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      ctx.throw(500, 'An error occurred while sending bulk emails');
    }
  },

  /**
   * Export orders to CSV
   */
  async exportOrdersCsv(ctx) {
    try {
      const { type } = ctx.query; // 'dvd' or 'digital'

      // Build the query to find the relevant orders
      const query = {
        populate: ['users_permissions_user'],
        where: {}
      };

      if (type === 'dvd') {
        query.where.dvd_count = { $gt: 0 };
      } else if (type === 'digital') {
        query.where.$or = [
          { digital_download_count: { $gt: 0 } },
          { media_type: { $in: ['digital', 'both'] } }
        ];
      }

      // Find the orders
      const orders = await strapi.db.query('api::order.order').findMany(query);

      // Prepare data for CSV
      const csvData = orders.map(order => ({
        id: order.id,
        name: order.users_permissions_user ?
              `${order.users_permissions_user.first_name || ''} ${order.users_permissions_user.last_name || ''}`.trim() ||
              order.users_permissions_user.email :
              'Unknown',
        email: order.users_permissions_user ? order.users_permissions_user.email : 'Unknown',
        order_date: order.createdAt ? new Date(order.createdAt).toISOString().split('T')[0] : '',
        status: order.media_status || 'pending',
        dvd_count: order.dvd_count || 0,
        digital_count: order.digital_download_count || 0,
        access_code: order.access_code || '',
        access_code_emailed: order.access_code_emailed ? 'Yes' : 'No',
        notes: order.media_notes || ''
      }));

      // Convert JSON to CSV
      const fields = [
        'id', 'name', 'email', 'order_date', 'status',
        'dvd_count', 'digital_count', 'access_code', 'access_code_emailed', 'notes'
      ];
      const csv = parse(csvData, { fields });

      // Set response headers
      ctx.set('Content-Type', 'text/csv');
      ctx.set('Content-Disposition', `attachment; filename="${type}-orders.csv"`);

      // Send the CSV file
      return csv;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      ctx.throw(500, 'An error occurred while exporting the CSV');
    }
  }
}));
