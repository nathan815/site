const path = require('path');
var WebpackNotifierPlugin = require('webpack-notifier');

module.exports = {
  entry: './src/js/main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new WebpackNotifierPlugin({skipFirstNotification: true})
  ]
}; 