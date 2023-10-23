const express = require('express')
const app = express();
const router = express.Router()

app.set('view engine', 'ejs')

router.get('/:id', (req, res) => {
    res.render(`product/index`, {id: `${req.params.id}`}) 
})

module.exports = router