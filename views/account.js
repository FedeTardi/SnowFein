const express = require('express');
const app = express();
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const nodeMailer = require('nodemailer');
const transporter = require('./account/nodeMailer/nodeMailerConfig');

const accountRoutes = express.Router();

const bcrypt = require('bcrypt');
const saltRounds = 10;

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

app.set('view engine', 'ejs');
accountRoutes.use(express.static('public'));
accountRoutes.use(bodyParser.urlencoded({ extended: true }));
accountRoutes.use(bodyParser.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'database sito nuovo'
});

passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
        pool.getConnection((err, connection) => {
            if (err) {
                return done(err);
            }

            connection.query('SELECT * FROM accounts WHERE email = ?', [email], (err, results) => {
                connection.release();

                if (err) {
                    return done(err);
                }

                if (results.length === 0) {
                    return done(null, false, { message: 'Utente non trovato' });
                }

                const user = results[0];

                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) {
                        return done(err);
                    }
                    if (!isMatch) {
                        return done(null, false, { message: 'Password errata' });
                    }

                    return done(null, user);
                });
            });
        });
    })
);

passport.serializeUser((user, done) => {
    done(null, user.email);
});

passport.deserializeUser((email, done) => {
    pool.getConnection((err, connection) => {
        if (err) {
            return done(err);
        }

        connection.query('SELECT * FROM accounts WHERE email = ?', [email], (err, results) => {
            connection.release();

            if (err) {
                return done(err);
            }

            if (results.length === 0) {
                return done(null, false, { message: 'Utente non trovato' });
            }

            const user = results[0];
            return done(null, user);
        });
    });
});




accountRoutes.get('/', (req, res) => {
    res.send('home di account')
});


accountRoutes.get('/register', (req, res) => {
    res.render(`account/register`);
});

accountRoutes.post('/register', async (req, res) => {
    var { name, surname, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    surname = surname.charAt(0).toUpperCase() + surname.slice(1).toLowerCase();
    email = email.toLowerCase();

    let code = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 6; i++) { // Genera un codice di lunghezza 6
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const info = await transporter.sendMail({
        from: '"RaptHill 🦖" <RaptHill@gmail.com>',
        to: email,
        subject: "Validazione account RaptHill ",
        text: "",
        html: `
        <html>
        <head>
            <style>
                body{
                   display: flex; 
                   align-items: center; 
                }
                .container {
                    font-size: 15px;
                    width: 80%;
                    margin: 0 auto;
                    padding: 20px;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    color: black;
                }
                /* ... altri stili ... */
            </style>
        </head>
        <body>
            <div class="container" style="color: black">
                <p>Gentile ${name},</p>
                <p>Grazie per esserti registrato su RaptHill!</p>
                <p>Il codice di verifica per attivare il tuo account è: <strong>${code}</strong></p>
                <p>Se non hai effettuato questa richiesta di registrazione, ti preghiamo di ignorare questa email.</p>
                <p>Cordiali saluti,<br>Il Team RaptHill</p>
            </div>
        </body>
        </html>
        `,
    });
    /*

    pool.getConnection((err, connection) => {
        if (err) {
            console.log('Errore nella connessione al database:', err);
            return res.status(500).send('Errore nella connessione al database');
        }

        const dataToInsert = {
            name: name,
            surname: surname,
            email: email,
            password: hashedPassword,
            verificationCode: code,
        };



        connection.query('INSERT INTO accountstoverificate SET ?', dataToInsert, (err, results) => {
            if (err) {
                console.error('Errore durante l\'inserimento dei dati:', err);
            } else {
                res.redirect('/account/verification');
                console.log(code)
            }
        });

        connection.release();
    });
    */
});

accountRoutes.get('/login', (req, res) => {
    res.render('account/login');
});

accountRoutes.post('/login', passport.authenticate('local', {
    successRedirect: '/account/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}), function (req, res) {
    req.session.isAuthenticated = true;
});

accountRoutes.get('/dashboard', (req, res) => {
    res.render('account/dashboard');
});

accountRoutes.get('/verification', (req, res) => {
    res.render('account/verification');
});

module.exports = accountRoutes;