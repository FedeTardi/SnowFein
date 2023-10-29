const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const accountRoutes = express.Router();
const saltRounds = 10;

app.set('view engine', 'ejs');
accountRoutes.use(express.static('public'));
accountRoutes.use(bodyParser.urlencoded({ extended: false }));
accountRoutes.use(bodyParser.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'database sito nuovo'
});

accountRoutes.get('/', (req, res) => {
    res.send('home di account')
});

accountRoutes.get('/register', (req, res) => {
    res.render(`account/register`);
});

accountRoutes.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds); //codifica della password

    pool.getConnection((err, connection) => {
        if(err) {
            console.log('Errore nella connessione al database:', err);
            return res.status(500).send('Errore nella connessione al database');
        }

        const dataToInsert = {
            email: email,
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

module.exports = accountRoutes;