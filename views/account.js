const express = require('express');
const app = express();
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const accountRoutes = express.Router();

const bcrypt = require('bcrypt');
const saltRounds = 10;

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./passport/user.js');

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

app.post('/login', passport.authenticate('local', {
    successRedirect: '/account/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}), function (req, res) {
    req.session.isAuthenticated = true;
});

accountRoutes.get('/dashboard', (req, res) => {
    res.send('login riuscito');
});

module.exports = accountRoutes;