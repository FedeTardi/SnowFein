const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'RaptHill@gmail.com',
        pass: 'ceht ulgg ilna uchj'
    }
});

module.exports = transporter;