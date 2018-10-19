const webpack = require('webpack')

module.exports = {
  entry: './index.js',
  mode: 'development',
  optimization: {
    minimize: false
  },
  performance: {
    hints: false
  },
  output: {
    path: __dirname + '/dist',
    publicPath: 'dist',
    filename: 'worker.js'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.RAVEN_DSN': JSON.stringify(process.env.RAVEN_DSN),
    })
  ]
}
