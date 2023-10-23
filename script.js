const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;
const saltRounds = 10;

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, "views"))
// Configura il middleware per il parsing dei dati del modulo body-parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Dati utente di esempio (generalmente dovresti salvarli in un database)
const users = [];

// Pagina di registrazione
app.get('/register', (req, res) => {
    res.render(`register`);
});

// Registrazione dell'utente
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    let usersData = [];

    try {
        const rawData = fs.readFileSync('data.json');
        usersData = JSON.parse(rawData);
        // Esegui altre operazioni con jsonData
    } catch (error) {
        console.error('Errore durante l\'analisi del file JSON:', error);
    }

    if (usersData.some(item => item.username === username)) {

        res.render('login');

    } else {

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        usersData.push({ username, password: hashedPassword });
        fs.writeFileSync('data.json', JSON.stringify(usersData, null, 2));

        res.send('Registrazione completata');
    }
});

const productsRouter = require('./routes/products')
app.use('/products', productsRouter)

app.get('/login', (req, res) => {
    res.render('login');
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
            if(error) {
                console.log(error);
            } else if(result) {
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
