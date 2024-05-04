const express = require('express');
const path = require('path');
const http = require('http')
const session = require('express-session');
const passport = require('passport');
const device = require('express-device');

const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const app = express();
const LocalStrategy = require('passport-local').Strategy;

const mysql = require('mysql2');

const nodeMailer = require('nodemailer');
const transporter = require('./nodeMailer/nodeMailerConfig');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const httpServer = http.createServer(app);
const httpPort = 8008;

const accountRoutes = require('./views/account.js');
app.use('/account', accountRoutes);



app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, "views"))
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(session({
    secret: 'lWza8IO3KGB2DElgDewkP528wm6ggFBd',
    resave: false,
    saveUninitialized: false,
}));

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

app.use(passport.initialize());
app.use(passport.session());

app.use(device.capture());

app.use((req, res, next) => {
    req.deviceType = req.device.type;
    next();
});

app.get('/', (req, res) => {
    res.redirect('/home');
});

app.get('/home', (req, res) => {
    res.render('pages/' + req.deviceType + '/home');
});

app.get('/register', (req, res) => {
    res.render('pages/' + req.deviceType + '/register');
});

app.post('/register', async (req, res) => {
    var { name, surname, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    surname = surname.charAt(0).toUpperCase() + surname.slice(1).toLowerCase();
    email = email.toLowerCase();
    req.session.email = email;

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
                req.session.needToVerify = true;
                res.redirect('/verify');
            }
        });

        connection.release();
    });
});

app.get('/login', (req, res) => {
    res.render('pages/' + req.deviceType + '/login');
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/account/dashboard',
    failureRedirect: '/login'
}), function (req, res) {
    req.session.isAuthenticated = true;
});

app.get('/verify', (req, res) => {
    if (req.session.needToVerify) {
        res.render('account/verification', { emailToVerify: req.session.email })
    } else {
        res.redirect('/account/login')
    }
});

app.post('/verify', (req, res) => {
    let verificationCode;
    pool.getConnection((err, connection) => {
        if (err) {
            return done(err);
        }

        connection.query('SELECT verificationCode FROM accountstoverificate WHERE email = ?', [req.session.email], (err, results) => {
            connection.release();
            if (err) {
                return done(err);
            }
            if (results.length === 0) {
                return done(null, false, { message: 'Utente non trovato' });
            }
            const user = results[0];
            verificationCode = user.verificationCode;
            return done(null, user);
        });
        connection.release();
    });

    for (let i = 1; i <= 6; i++) {
        const inputName = 'input' + i;
        const inputValue = req.body[inputName];

        if (typeof inputValue === 'string') {
            verificationCode.push(inputValue);
        } else {
            return res.status(400).send('Valori di input mancanti o non validi.');
        }
    }
    const userCode = verificationCode.join('');

    if (userCode == verificationCode) {

    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('pages/error');
});

app.use((req, res) => {
    res.status(404).render('pages/pageNotFound');
});


httpServer.listen(httpPort, () => {
    console.log(`Server listening on http port ${httpPort}`);
});