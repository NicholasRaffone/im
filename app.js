import express from 'express'
import cors from 'cors'
const Alpaca = require('@alpacahq/alpaca-trade-api')
const fs = require('fs')
require('dotenv').config()
const app = express()
const port = 8000

const stocklist = [];
let alpaca;
if(process.env.ENV==='DEVELOPMENT'){
    alpaca = new Alpaca({
        keyId: process.env.TEST_ALPACA_KEY_ID,
        secretKey: process.env.TEST_ALPACA_SECRET_KEY,
        paper: true,
    })
}else if(process.env.ENV==='PRODUCTION'){
    alpaca = new Alpaca({
        keyId: process.env.ALPACA_KEY_ID,
        secretKey: process.env.ALPACA_SECRET_KEY,
        paper: false,
    })
}else{
    throw new Error("Error: Environment Not Properly Selected")
}

//read stocklist 
fs.readFile('stocklist.txt', function(err, data) {
    if(err) throw err;
    var array = data.toString().split("\n");
    for(const stock of array) {
        const [symbol, name] = stock.split(' ')
        if(symbol&&name){
            let currstock ={
                symbol,
                name:name.replace("\"","")
            }
            stocklist.push(currstock)
        }
    }
});

app.use(express.json())
app.use(cors())


app.post('/buy_order', async(req, res)=>{
    try{
        const {ticker} = req.body;
        const order = await alpaca.createOrder({
            symbol:ticker,
            qty:1,
            side: 'buy',
            type:'market',
            time_in_force:'day'
        })
        res.json({order})
    }catch(e){
        console.log(e)
        res.status(400).send('err')
    }
})


app.post('/sell_all', async(req, res)=>{
    try{
        await alpaca.closeAllPositions();
        res.json({'success':'success'})
    }catch(e){
        console.log(e)
    }
})

app.get('/timeline', async(req, res)=>{
    try{
        const history = await alpaca.getPortfolioHistory({
            period: '1D',
            timeframe:'1Min'
          })
        const last_elem = history.equity[history.equity.length-1]===null ? Math.max(0, await history.equity.findIndex(e=>e===null)): history.equity.length;
        const cut_history = {
            equity:history.equity.slice(0,last_elem),
            profit_loss: history.profit_loss[last_elem-1],
            profit_loss_pct: history.profit_loss_pct[last_elem-1],
            start_val: history.profit_loss[last_elem-1] + history.equity[last_elem-1]
        };
        if(cut_history.profit_loss)
            res.json({...cut_history})
        else
            res.json({equity:[200,100,50,200],profit_loss:20,profit_loss_pct:0.1})
    }catch(e){
        console.log(e)
        res.send('err')
    }
})

app.get('/randtickers', async(req,res)=>{
    try{
        const rand1 = Math.floor(stocklist.length * Math.random());
        let rand2 = Math.floor(stocklist.length * Math.random());
        while(rand2===rand1){
            rand2 = Math.floor(stocklist.length * Math.random());
        }
        res.json({tickers: [stocklist[rand1],stocklist[rand2]]})
    }catch(e){
        res.status(400).send('err')
    }
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
