'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const crypto = require('crypto');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

module.exports = createCoreService('api::payment-link.payment-link', ({ strapi }) => ({
  generateUniqueToken() {
    return crypto.randomUUID();
  },

  createPaymentUrl(token) {
    const baseUrl = process.env.PAYMENT_LINK_BASE_URL || `${process.env.FRONTEND_URL}/purchase-digital`;
    return `${baseUrl}/${token}`;
  },

  validateExpiry(paymentLink) {
    const now = new Date();
    const expiresAt = new Date(paymentLink.expires_at);
    return now > expiresAt;
  },

  async logAccess(paymentLink, action, ctx, details = {}) {
    try {
      console.log('Logging access for payment link:', { 
        paymentLinkId: paymentLink.id, 
        action,
        requestExists: !!ctx.request 
      });
      
      const ipAddress = ctx.request?.ip || ctx.request?.header?.['x-forwarded-for'] || 'unknown';
      const userAgent = ctx.request?.header?.['user-agent'] || 'unknown';

      await strapi.entityService.create('api::payment-link-access-log.payment-link-access-log', {
        data: {
          payment_link: paymentLink.id,
          accessed_at: new Date(),
          ip_address: ipAddress,
          user_agent: userAgent,
          action: action,
          details: details
        }
      });
      
      console.log('Successfully logged access');
    } catch (error) {
      console.error('Error logging payment link access:', error);
      console.error('Error details:', error.message);
    }
  },

  generateAccessCode() {
    const year = new Date().getFullYear();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const numberPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `DVL-${year}-${randomPart}${numberPart}`;
  },

  async sendPaymentLinkEmail(paymentLink, paymentUrl) {
    try {
      const mailgun = require('mailgun-js')({ 
        apiKey: process.env.MAILGUN_API_KEY, 
        domain: process.env.MAILGUN_DOMAIN 
      });

      const expiryDate = new Date(paymentLink.expires_at).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4a5568; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f7fafc; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #718096; font-size: 14px; }
            .price { font-size: 24px; font-weight: bold; color: #2d3748; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reverence Studios</h1>
              <h2>Your Digital Download Purchase Link</h2>
            </div>
            <div class="content">
              <p>Dear ${paymentLink.customer_name},</p>
              
              ${paymentLink.custom_message ? `<p>${paymentLink.custom_message}</p>` : ''}
              
              <p>You're invited to purchase the digital download of our recital performance.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <p class="price">$${paymentLink.amount.toFixed(2)}</p>
                <a href="${paymentUrl}" class="button">Complete Your Purchase</a>
              </div>
              
              <p><strong>What you'll receive:</strong></p>
              <ul>
                <li>Instant access to the full recital recording</li>
                <li>High-quality video download</li>
                <li>Access code valid until December 31, 2025</li>
              </ul>
              
              <p style="color: #e53e3e; font-weight: bold;">
                Important: This link will expire on ${expiryDate}
              </p>
              
              <p>If you have any questions, please don't hesitate to contact us at ${process.env.MAIL_REPLY_TO_ADDRESS || 'support@reverence.dance'}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Reverence Studios. All rights reserved.</p>
              <p>This is a one-time purchase link specifically created for you.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailData = {
        from: process.env.MAIL_FROM_ADDRESS || 'noreply@reverence.dance',
        to: paymentLink.customer_email,
        subject: 'Your Digital Download Purchase Link - Reverence Studios',
        html: emailHtml
      };

      await mailgun.messages().send(emailData);
      
      console.log(`Payment link email sent to ${paymentLink.customer_email}`);
    } catch (error) {
      console.error('Error sending payment link email:', error);
      throw error;
    }
  },

  async sendConfirmationEmail(order, paymentLink) {
    try {
      const mailgun = require('mailgun-js')({ 
        apiKey: process.env.MAILGUN_API_KEY, 
        domain: process.env.MAILGUN_DOMAIN 
      });

      const viewingUrl = `${process.env.FRONTEND_URL}/watch-recital`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #48bb78; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f7fafc; }
            .access-code { background: #fff; border: 2px dashed #48bb78; padding: 20px; text-align: center; margin: 20px 0; }
            .access-code h3 { font-size: 28px; color: #2d3748; margin: 10px 0; letter-spacing: 2px; }
            .button { display: inline-block; padding: 12px 30px; background: #48bb78; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #718096; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reverence Studios</h1>
              <h2>Your Digital Download is Ready!</h2>
            </div>
            <div class="content">
              <p>Dear ${paymentLink.customer_name},</p>
              
              <p>Thank you for your purchase! Your digital download access is now active.</p>
              
              <div class="access-code">
                <p style="margin: 5px 0;">Your Access Code:</p>
                <h3>${order.access_code}</h3>
              </div>
              
              <div style="text-align: center;">
                <a href="${viewingUrl}" class="button">Access Your Download</a>
              </div>
              
              <p><strong>How to access your content:</strong></p>
              <ol>
                <li>Visit the viewing page using the button above</li>
                <li>Enter your access code: <strong>${order.access_code}</strong></li>
                <li>Choose to stream online or download the video files</li>
              </ol>
              
              <p><strong>Important Information:</strong></p>
              <ul>
                <li>Your access code is valid until December 31, 2025</li>
                <li>You can download the videos multiple times</li>
                <li>Keep this email for your records</li>
              </ul>
              
              <p>If you have any issues accessing your content, please contact us at ${process.env.MAIL_REPLY_TO_ADDRESS || 'support@reverence.dance'}</p>
              
              <p>Thank you for supporting Reverence Studios!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Reverence Studios. All rights reserved.</p>
              <p>Order ID: ${order.id} | Purchase Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailData = {
        from: process.env.MAIL_FROM_ADDRESS || 'noreply@reverence.dance',
        to: paymentLink.customer_email,
        subject: 'Digital Download Access Ready - Reverence Studios',
        html: emailHtml
      };

      await mailgun.messages().send(emailData);
      
      console.log(`Confirmation email sent to ${paymentLink.customer_email}`);

      if (process.env.NODE_ENV === 'production') {
        await strapi.plugins['email'].services.email.send({
          to: process.env.MAIL_FROM_ADDRESS,
          from: 'success@reverencestudios.com',
          subject: 'Digital download purchased via payment link',
          text: `Customer ${paymentLink.customer_name} (${paymentLink.customer_email}) has successfully purchased a digital download for $${paymentLink.amount}. Access code: ${order.access_code}`
        });
      }
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      throw error;
    }
  },

  async cleanupExpiredLinks() {
    try {
      const expiredLinks = await strapi.entityService.findMany('api::payment-link.payment-link', {
        filters: {
          status: 'pending',
          expires_at: { $lt: new Date() }
        }
      });

      for (const link of expiredLinks) {
        await strapi.entityService.update('api::payment-link.payment-link', link.id, {
          data: { status: 'expired' }
        });

        if (link.stripe_payment_intent_id) {
          try {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            await stripe.paymentIntents.cancel(link.stripe_payment_intent_id);
          } catch (stripeError) {
            console.error(`Error canceling payment intent ${link.stripe_payment_intent_id}:`, stripeError);
          }
        }
      }

      console.log(`Cleaned up ${expiredLinks.length} expired payment links`);
      return expiredLinks.length;
    } catch (error) {
      console.error('Error cleaning up expired links:', error);
      throw error;
    }
  }
}));