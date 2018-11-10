const path = require('path');
const WebpackNotifierPlugin = require('webpack-notifier');


module.exports = {
  entry: './src/js/main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new WebpackNotifierPlugin()
  ]
}; 
