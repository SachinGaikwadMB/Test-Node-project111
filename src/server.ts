import express, { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import Logging from "./library/Logger/logger";
import { config as devConfig } from "./config/development.config";
import { config } from "dotenv";
import { routes } from "./routes/index";
config();

const app = express();

/** To surpass the strictQuery deprecation warning */
mongoose.set("strictQuery", false);

/** Connect to Mongo */
mongoose
  .connect(devConfig.mongo.url, {
    retryWrites: true,
    w: "majority",
  })
  .then(() => {
    Logging.info("Mongo connected successfully.");
    StartServer();
  })
  .catch((error) => Logging.error(error));

/** Only Start Server if Mongoose Connects */
const StartServer = async () => {
  try {
    /** Log the request */
    app.use((req, res, next) => {
      /** Log the req */
      Logging.info(
        `Incomming - METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`
      );

      res.on("finish", () => {
        /** Log the res */
        Logging.info(
          `Result - METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}] - STATUS: [${res.statusCode}]`
        );
      });

      next();
    });

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // routes
    app.use("/api", routes);

    /** Healthcheck */
    app.get("/test", (req, res, next) =>
      res.status(200).json({ hello: "world" })
    );

    //This middleware handles application error
    const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
      res.status(error.status || 500);
      res.send({ status: error.status || 500, message: error.message });
    };

    app.use(errorHandler);

    /** Error handling */
    app.use((req, res, next) => {
      const error = new Error("Not found");

      Logging.error(error);

      res.status(404).json({
        message: error.message,
      });
    });

    app.listen(process.env.PORT, () => {
      Logging.info(`Server running on PORT :${process.env.PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};