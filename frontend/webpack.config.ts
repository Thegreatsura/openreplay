import webpack from "webpack";
import path from "path";
import { Configuration as WebpackConfiguration } from "webpack";
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CompressionPlugin from "compression-webpack-plugin";
import { EsbuildPlugin } from 'esbuild-loader';
// @ts-ignore
import dotenv from 'dotenv'

const stylesHandler = MiniCssExtractPlugin.loader;
import pathAlias from './path-alias';

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration
}

export default function build({ production }: { production?: boolean }) {
  const isDevelopment = process.env.NODE_ENV !== 'production' && !production;
  dotenv.config({ path: __dirname + (isDevelopment ? '/.env' : '/.env.production') });

  const ENV_VARIABLES = JSON.stringify(process.env);
  const finalEnv = isDevelopment ? 'development' : 'production'
  console.log('running in', finalEnv);

  const config: Configuration = {
  mode: finalEnv,
  output: {
    publicPath: "/",
    filename: 'app-[contenthash:7].js',
    path: path.resolve(__dirname, 'public'),
  },
  entry: "./app/initialize.tsx",
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
    minimizer: [
     new EsbuildPlugin({
       target: 'es2020',
       css: true
    })
   ]
  },
  module: {
    exprContextCritical: false,
    rules: [
      {
        test: /\.tsx?$/i,
        exclude: isDevelopment ? /node_modules/ : undefined,
        loader: "esbuild-loader",
        options: {
          target: 'es2020',
        },
      },
      {
        test: /\.jsx?$/i,
        exclude: isDevelopment ? /node_modules/ : undefined,
        loader: "esbuild-loader",
        options: {
          loader: 'jsx',
          target: 'es2020',
        },
      },
      {
        test: /\.s[ac]ss$/i,
        exclude: /node_modules/,
        use: [stylesHandler, 'css-loader', 'postcss-loader', 'sass-loader'],
      },
      {
        test: /\.css$/i,
        // exclude: /node_modules/,
        use: [
          stylesHandler,
          {
            loader: "css-loader",
            options: {
              modules: {
                mode: "local",
                auto: true,
                namedExport: false,
                exportLocalsConvention: 'as-is',
                localIdentName: "[name]__[local]--[hash:base64:5]",
              }
              // url: {
              //     filter: (url: string) => {
              //       // Semantic-UI-CSS has an extra semi colon in one of the URL due to which CSS loader along
              //       // with webpack 5 fails to generate a build.
              //       // Below if condition is a hack. After Semantic-UI-CSS fixes this, one can replace use clause with just
              //       // use: ['style-loader', 'css-loader']
              //       if (url.includes('charset=utf-8;;')) {
              //         return false;
              //       }
              //       return true;
              //     },
              // }
            },
          },
          'postcss-loader'
        ],
      },
      // {
      //   test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
      //   exclude: /node_modules/,
      //   type: 'asset',
      // },
      // {
      //   test: /\.svg/,
      //   use: ["@svgr/webpack"],
      // },
      {
        test: /\.(svg)$/i,
        exclude: /node_modules/,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: pathAlias,
    fallback: {
      assert: false,
    },
  },
  plugins: [
    new webpack.ProgressPlugin(),
    (isDevelopment ? false : new CompressionPlugin({
      test: /\.(js|css|html|svg)$/,
      algorithm: 'brotliCompress',
      threshold: 10240,
    })),
    new webpack.DefinePlugin({
      // 'process.env': ENV_VARIABLES,
      'window.env': ENV_VARIABLES,
      'window.env.NODE_ENV': JSON.stringify(finalEnv),
      'window.env.PRODUCTION': isDevelopment ? false : true,
    }),
    new HtmlWebpackPlugin({
      template: 'app/assets/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "./app/assets", to: "assets" },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: '[name]-[contenthash:7].css',
      chunkFilename: '[id]-[contenthash:7].css',
      ignoreOrder: true
    }),
],
  devtool: isDevelopment ? "inline-source-map" : false,
  performance: {
    hints: false,
  },
  watchOptions: { ignored: "**/node_modules/**" },
  devServer: {
    // static: path.join(__dirname, "public"),
    historyApiFallback: true,
    host: '0.0.0.0',
    open: true,
    port: 3333,
    hot: true,
    allowedHosts: "all",
      client: {
        overlay: {
          errors: true,
          warnings: false,
          runtimeErrors: false,
        }
      },
  },
};
  return config
}
