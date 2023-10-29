const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, "views"))
// Configura il middleware per il parsing dei dati del modulo body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const accountRoutes = require('./views/account.js');
app.use('/account', accountRoutes);

app.get('/login', (req, res) => {
    res.render('account/login');
});
// Verifica il login
app.post('/login', async (req, res) => {

    let usersData = [];

    try {
        const rawData = fs.readFileSync('data.json');
        usersData = JSON.parse(rawData);
        // Esegui altre operazioni con jsonData
    } catch (error) {
        console.error('Errore durante l\'analisi del file JSON:', error);
    }

    const { username, password } = req.body;
    if (usersData.some(item => item.username === username)) {
        const user = usersData.find(item => item.username === username);
        bcrypt.compare(password, user.password, (error, result) => {
            if (error) {
                console.log(error);
            } else if (result) {
                res.send('login riuscito');
            } else {
                res.send('password errata');
            }
        });
    } else {
        res.send('username non trovato')
    }


});

app.listen(port, () => {
    console.log(`Server in ascolto su http://localhost:${port}`);
});