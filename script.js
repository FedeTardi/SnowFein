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
    database: 'snowfein'
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

app.get('/privacy-policy', (req, res) => {
    res.render('pages/desktop/privacy-policy');
});

app.get('/about-us', (req, res) => {
    res.render('pages/desktop/privacy-policy');
});

app.get('/terms', (req, res) => {
    res.render('pages/desktop/terms');
});

app.get('/home', (req, res) => {
    if (req.deviceType == 'desktop' || req.deviceType == 'tablet') {
        res.render('pages/desktop/home');
    } else if (req.deviceType == 'phone') {
        res.render('pages/mobile/home');
    }
});

app.get('/register', (req, res) => {
    if (!req.session.isAuthenticated) {
        if (req.deviceType == 'desktop' || req.deviceType == 'tablet') {
            res.render('pages/desktop/register');
        } else if (req.deviceType == 'phone') {
            res.render('pages/mobile/register');
        }
    }
});

app.post('/register', async (req, res) => {
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
        from: '"SnowFein " <RaptHill@gmail.com>',
        to: email,
        subject: "Validazione account SnowFein ",
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
                <p>Grazie per esserti registrato su SnowFein!</p>
                <p>Il codice di verifica per attivare il tuo account è: <strong>${code}</strong></p>
                <p>Se non hai effettuato questa richiesta di registrazione, ti preghiamo di ignorare questa email.</p>
                <p>Cordiali saluti,<br>Il Team SnowFein</p>
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
                if (err === 'ER_DUP_ENTRY') {
                    alert("Email già registrata");
                    res.render('/login')
                } else {
                    console.error('Errore durante l\'inserimento dei dati:', err);
                }
            } else {
                req.session.emailToVerify = email;
                req.session.needToVerify = true;
                res.redirect('/verification');
            }
        });

        connection.release();
    });
});

app.get('/login', (req, res) => {
    if (!req.session.isAuthenticated) {
        res.render('pages/' + req.deviceType + '/login');
    } else {
        res.redirect('/account/dashboard');
    }
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/account/dashboard',
    failureRedirect: '/login'
}), function (req, res) {
    req.session.isAuthenticated = true;
});

app.get('/verification', (req, res) => {
    if (req.session.needToVerify && req.session.email) {
        const emailToVerify = req.session.emailToVerify;
        res.render('pages/desktop/verification', { emailToVerify });
    } else {
        res.redirect('/login')
    }
});

app.post('/verification', (req, res) => {
    const verificationCode = [];

    for (let i = 1; i <= 6; i++) {
        const inputName = 'input' + i;
        const inputValue = req.body[inputName];

        if (typeof inputValue === 'string' && inputValue.length === 1) {
            verificationCode.push(inputValue);
        } else {
            return res.status(400).send('Errore: Tutti i campi del codice di verifica devono essere riempiti.');
        }
    }

    const userCode = verificationCode.join('');

    pool.getConnection((err, connection) => {
        if (err) {
            console.log('Errore nella connessione al database:', err);
            return res.status(500).send('Errore nella connessione al database');
        }

        connection.query('SELECT * FROM accountstoverificate WHERE email = ?', [req.session.emailToVerify], (err, results) => {
            if (err) {
                connection.release();
                console.error('Errore durante la query:', err);
                return res.status(500).send('Errore durante la query');
            }

            if (results.length === 0) {
                connection.release();
                return res.status(400).send('Utente non trovato o codice di verifica errato');
            }

            const user = results[0];
            const expectedCode = user.verificationCode;

            if (userCode !== expectedCode) {
                connection.release();
                redirect('/verification');
            }

            const dataToInsert = {
                name: user.name,
                surname: user.surname,
                email: user.email,
                password: user.password
            };

            connection.query('INSERT INTO accounts SET ?', dataToInsert, (err, results) => {
                if (err) {
                    connection.release();
                    console.error('Errore durante l\'inserimento dei dati:', err);
                    return res.status(500).send('Errore durante l\'inserimento dei dati');
                }

                connection.query('DELETE FROM accountstoverificate WHERE email = ?', [user.email], (err, results) => {
                    connection.release();
                    if (err) {
                        console.error('Errore durante l\'eliminazione dei dati:', err);
                        return res.status(500).send('Errore durante l\'eliminazione dei dati');
                    }

                    res.send('Verifica completata con successo e dati trasferiti');
                });
            });
        });
    });
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