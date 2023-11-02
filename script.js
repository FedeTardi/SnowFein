const express = require('express');
const path = require('path');

const session = require('express-session');
const passport = require('passport');

const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, "views"))
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
    secret: 'lWza8IO3KGB2DElgDewkP528wm6ggFBd',
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

const accountRoutes = require('./views/account.js');
app.use('/account', accountRoutes);

app.get('*', (req, res) => {
    res.status(404).send('Pagina non trovata');
});

app.listen(port, () => {
    console.log(`Server in ascolto su http://localhost:${port}`);
});