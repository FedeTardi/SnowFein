const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'RaptHill@gmail.com',
        pass: 'Raptor2023'
    }
});

module.exports = transporter;