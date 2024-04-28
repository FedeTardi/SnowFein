const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const accountRoutes = express.Router();

app.set('view engine', 'ejs');
accountRoutes.use(express.static('public'));
accountRoutes.use(bodyParser.urlencoded({ extended: true }));
accountRoutes.use(bodyParser.json());


accountRoutes.get('/', (req, res) => {
    res.send('home di account')
});

accountRoutes.get('/dashboard', (req, res) => {
    if (req.session.isAuthenticated) {
        res.render('account/dashboard');
    } else {
        res.redirect('/account/login')
    }

});



module.exports = accountRoutes;