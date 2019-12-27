const nodemailer = require('nodemailer');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.custom_data.email;
    this.firstName = user.name;
    this.url = url;
    this.from = `App <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    // Sendgrid
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USERNAME,
        pass: process.env.SENDGRID_KEY
      }
    });
  }

  // Send the actual email
  async send(subject, text) {
    const message = `${subject}: ${text}`;

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text: message
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome(url) {
    await this.send(
      'welcome',
      `Welcome to the App! GO to this link to get more credits: ${url}`
    );
  }

  async sendPasswordReset(resetUrl) {
    await this.send(
      'passwordReset',
      `Your password reset token (valid for only 10 minutes). To reset your Email go to this link: ${resetUrl}`
    );
  }
};
