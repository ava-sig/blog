const {app,initDb}=require('./app');initDb().then(()=>app.listen(3000,()=>console.log('3000')))
