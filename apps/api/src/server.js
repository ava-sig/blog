const { app, initDb } = require('./app')

const port = Number(process.env.PORT || 3000)

initDb().then(() => {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] listening on ${port}`)
  })
})
