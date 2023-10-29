const express = require('express');
const bcrypt = require('bcrypt');
const fs = require('fs');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const router = express.Router();

const app = express();
const saltRounds = 10;

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'database sito nuovo'
});

app.get('/register', (req, res) => {
    res.render(`register`);
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds); //codifica della password

    pool.getConnection((err, connection) => {
        if(err) {
            console.log('Errore nella connessione al database:', err);
            return res.status(500).send('Errore nella connessione al database');
        }

        const dataToInsert = {
            email: username,
            password: hashedPassword
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

module.exports = router;