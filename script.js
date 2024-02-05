const express = require('express');
const path = require('path');
const http = require('http')
const session = require('express-session');
const passport = require('passport');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const app = express();
const httpServer = http.createServer(app);
const httpPort = 80;

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

app.use(passport.initialize());
app.use(passport.session());

const accountRoutes = require('./views/account.js');
app.use('/account', accountRoutes);

app.get('/home', (req, res) => {
    res.render('pages/home')
});

app.get('/', (req, res) => {
    res.redirect('/home');
});

httpServer.listen(httpPort, () => {
    console.log(`Server listening on http port ${httpPort}`);
});