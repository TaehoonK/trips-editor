const webpack = require('webpack')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const packageInfo = require('./package')

module.exports = env => {
  env = env || {}
  const isProduction = env.prod

  return {
    context: __dirname,
    devtool: isProduction ? false : 'source-map',

    entry: './src/main.tsx',

    output: {
      path: path.join(__dirname, 'build'),
      filename: isProduction ? '[name].[chunkhash:6].js' : '[name].js',
    },

    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },

    module: {
      rules: [
        { test: /\.tsx?$/, loaders: ['ts-loader'] },
        { test: /\.css$/, loaders: ['style-loader', 'css-loader'] },
        { test: /\.styl$/, loaders: ['style-loader', 'css-loader', 'stylus-loader'] },
        { test: /\.ya?ml$/, loaders: ['json-loader', 'yaml-loader'] },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({ template: 'src/template.html' }),
      new webpack.DefinePlugin({
        'node.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        BUILD_VERSION: JSON.stringify(packageInfo.version),
        BUILD_TIME: JSON.stringify(new Date().toString()),
      }),
      new webpack.ProvidePlugin({
        Snabbdom: 'snabbdom-pragma',
      }),
    ].concat(
      isProduction
        ? [new UglifyJsPlugin({ uglifyOptions: { compress: { inline: false } } })]
        : [new webpack.NamedModulesPlugin(), new webpack.HotModuleReplacementPlugin()],
    ),

    devServer: {
      hot: true,
    },
  }
}
