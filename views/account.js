const express = require('express');
const passport = require('passport');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');

const accountRoutes = express.Router();

app.set('view engine', 'ejs');
accountRoutes.use(express.static('public'));
accountRoutes.use(bodyParser.urlencoded({ extended: true }));
accountRoutes.use(bodyParser.json());

accountRoutes.get('/', (req, res) => {
    res.redirect('/dashboard')
});

accountRoutes.get('/dashboard', (req, res) => {
    if (req.session.isAuthenticated) {
        res.render('pages/account/dashboard');
    } else {
        res.redirect('/login')
    }
});



module.exports = accountRoutes;