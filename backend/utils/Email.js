const nodemailer = require('nodemailer');
require('dotenv').config();

// Email Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send OTP Email
exports.sendOTPEmail = async (email, otp, action, role) => {
  const subject = action === 'register' 
    ? `Verify Your BreadBox ${role} Account` 
    : `Resend OTP - BreadBox ${role} Verification`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4c430; padding: 20px; text-align: center; color: #fff;">
        <h1>BreadBox</h1>
      </div>
      <div style="padding: 20px; background-color: #fff;">
        <h2>${subject}</h2>
        <p>Dear ${role},</p>
        <p>${action === 'register' ? `Thank you for choosing BreadBox! Please use the OTP below to verify your email.` : `New OTP for ${role} email verification.`}</p>
        <div style="font-size: 24px; font-weight: bold; color: #f4c430; text-align: center;">${otp}</div>
        <p>Valid for 10 minutes. Do not share.</p>
        <a href="https://breadbox.com/verify" style="padding: 10px 20px; background-color: #f4c430; color: #fff; text-decoration: none;">Verify Now</a>
      </div>
      <div style="text-align: center; color: #777;">
        <p>BreadBox © ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: '"BreadBox" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject,
    html: htmlContent,
  });
};

// Send Update Confirmation Email
exports.sendUpdateConfirmationEmail = async (email, name, updatedFields, role) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4c430; padding: 20px; text-align: center; color: #fff;">
        <h1>BreadBox</h1>
      </div>
      <div style="padding: 20px; background-color: #fff;">
        <h2>${role} Account Updated</h2>
        <p>Dear ${name},</p>
        <p>Your BreadBox ${role} account was updated.</p>
        <ul>
          ${Object.keys(updatedFields)
            .map((field) => `<li><strong>${field}:</strong> ${updatedFields[field]}</li>`)
            .join('')}
        </ul>
        <a href="https://breadbox.com/${role}-dashboard" style="padding: 10px 20px; background-color: #f4c430; color: #fff; text-decoration: none;">Go to Dashboard</a>
      </div>
      <div style="text-align: center; color: #777;">
        <p>BreadBox © ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: '"BreadBox" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject: `BreadBox ${role} Account Update`,
    html: htmlContent,
  });
};

// Send Password Update Confirmation Email
exports.sendPasswordUpdateConfirmationEmail = async (email, name, role) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4c430; padding: 20px; text-align: center; color: #fff;">
        <h1>BreadBox</h1>
      </div>
      <div style="padding: 20px; background-color: #fff;">
        <h2>Password Updated</h2>
        <p>Dear ${name},</p>
        <p>Your BreadBox ${role} account password was updated.</p>
        <a href="https://breadbox.com/${role}-dashboard" style="padding: 10px 20px; background-color: #f4c430; color: #fff; text-decoration: none;">Go to Dashboard</a>
      </div>
      <div style="text-align: center; color: #777;">
        <p>BreadBox © ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: '"BreadBox" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject: `BreadBox ${role} Password Update`,
    html: htmlContent,
  });
};

// Send Deletion Confirmation Email
exports.sendDeletionConfirmationEmail = async (email, name, role) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f4c430; padding: 20px; text-align: center; color: #fff;">
        <h1>BreadBox</h1>
      </div>
      <div style="padding: 20px; background-color: #fff;">
        <h2>${role} Account Deleted</h2>
        <p>Dear ${name},</p>
        <p>Your BreadBox ${role} account (${email}) was deleted.</p>
        <p>Sorry to see you go! Rejoin anytime.</p>
        <a href="https://breadbox.com" style="padding: 10px 20px; background-color: #f4c430; color: #fff; text-decoration: none;">Visit BreadBox</a>
      </div>
      <div style="text-align: center; color: #777;">
        <p>BreadBox © ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: '"BreadBox" <' + process.env.EMAIL_USER + '>',
    to: email,
    subject: `BreadBox ${role} Account Deletion`,
    html: htmlContent,
  });
};

// Export all functions
module.exports = exports;