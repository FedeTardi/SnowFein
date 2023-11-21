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
    const { name, surname, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) { // Genera un codice di lunghezza 6
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const mailOptions = {
        from: 'RaptHill@gmail.com',
        to: email,
        subject: 'Conferma Registrazione',
        text: `Il tuo codice di conferma è: ${code}`
    };

    const info = await transporter.sendMail({
        from: '"RaptHill 🦖" <RaptHill@gmail.com>',
        to: email,
        subject: "Ciao " + name,
        text: "Hello world?",
        html: "<b>Hello world?</b>",
    });

    pool.getConnection((err, connection) => {
        if (err) {
            console.log('Errore nella connessione al database:', err);
            return res.status(500).send('Errore nella connessione al database');
        }

        const dataToInsert = {
            name: name,
            surname: surname,
            email: email.toLowerCase(),
            password: hashedPassword,
        };

        connection.query('INSERT INTO accounts SET ?', dataToInsert, (err, results) => {
            if (err) {
                console.error('Errore durante l\'inserimento dei dati:', err);
            } else {
                res.send("dati salvati nel database");
            }
        });

        connection.release();
    });
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

/*

accountRoutes.get('/sendemail', (req, res) => {
    res.render('pages/email')
});

accountRoutes.post('/sendemail', async (req, res) => {
    const { email, number } = req.body;

    for (let i = 0; i < number; i++) {
        const info = await transporter.sendMail({
            from: '"SaraMart" <RaptHill@gmail.com>',
            to: email,
            subject: "Ricevuta d'acquisto" + i,
            html: `
            <p>Ci fa piacere sapere che hai voluto acquistare dal nostro sito, speriamo che resterai soddisfatto e ritornerai in futuro.</p>
            <img src="https://64.media.tumblr.com/262c122c52dc590e1ceb5f295c04f2c0/712cfe535ca51385-ec/s500x750/60d622597e6d7c4cbe4667675b57d6963fa268f1.jpg">
            <img src="https://i.pinimg.com/236x/31/4e/07/314e07e10bc5d39e2fb44d61e04543e8.jpg">
            <img src="https://preview.redd.it/some-creepy-cursed-images-idk-if-you-will-like-them-v0-l25jmxvihzv91.jpg?width=640&crop=smart&auto=webp&s=de33b93b3676789e79fc06e0b33092563e367717">
            <img src="https://preview.redd.it/some-creepy-cursed-images-idk-if-you-will-like-them-v0-5uynt0xhhzv91.jpg?width=640&crop=smart&auto=webp&s=b459412108bd8c309546639e868575f5880d88de">
        `,
        });
    }

    res.redirect('sendemail');
});

*/

module.exports = accountRoutes;