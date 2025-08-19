// api/custom/controllers/user.js
module.exports = {
  async forgotPassword(ctx) {
    const { email } = ctx.request.body;

    try {
      // Find user with the email
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        // Return success even if user doesn't exist (security best practice)
        return ctx.send({
          success: true,
          message: 'Reset link sent if email exists'
        });
      }

      // Generate random token
      const resetToken = require('crypto').randomBytes(64).toString('hex');

      // Set expiration time (24 hours from now)
      const resetPasswordTokenExpiration = Date.now() + 24 * 60 * 60 * 1000;

      // Store token in database
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordTokenExpiration: new Date(resetPasswordTokenExpiration)
        }
      });

      // Generate reset URL with token
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      // Send email with the reset URL (using the working configuration)
      await strapi.plugins['email'].services.email.send({
        to: user.email,
        from: 'success@reverencestudios.com', // Use the email that works in your other code
        subject: 'Reset your password',
        text: `Please use the following link to reset your password: ${resetUrl}`,
        html: `
          <p>Hello,</p>
          <p>You've requested to reset your password.</p>
          <p>Please click the link below to set a new password:</p>
          <p><a href="${resetUrl}" target="_blank">Reset Password</a></p>
          <p>This link is valid for 24 hours.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });

      return ctx.send({
        success: true,
        message: 'Reset link sent if email exists'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      return ctx.badRequest('Failed to send reset email');
    }
  },

  async resetPassword(ctx) {
    const { token, password } = ctx.request.body;

    if (!token || !password) {
      return ctx.badRequest('Token and password are required');
    }

    try {
      // Find user with the token
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { resetPasswordToken: token }
      });

      if (!user) {
        return ctx.badRequest('Invalid token');
      }

      // Check if token is expired
      const isTokenExpired = new Date(user.resetPasswordTokenExpiration) < new Date();

      if (isTokenExpired) {
        return ctx.badRequest('Token expired');
      }

      // Hash the new password
      const hashedPassword = await strapi.plugins['users-permissions'].services.user.hashPassword({ password });

      // Update user with new password and clear token
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordTokenExpiration: null
        }
      });

      return ctx.send({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      return ctx.badRequest('Failed to reset password');
    }
  }
};
