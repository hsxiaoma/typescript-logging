import {LFService, LoggerFactoryOptions, LogGroupRule, LogFormat} from "../src/LoggerFactoryService";
import {LogLevel, LoggerType} from "../src/Logger";
import {MessageBufferLoggerImpl, AbstractLogger, ConsoleLoggerImpl} from "../src/LoggerImpl";

/**
 * Custom logger for testing, only logs the last message.
 */
class CustomLoggerImpl extends AbstractLogger {

  private _message: string;

  constructor(name: string, rule: LogGroupRule) {
    super(name, rule);
  }

  protected doLog(msg: string): void {
    this._message = msg;
  }


  get message(): string {
    return this._message;
  }
}

describe("Loggers", () => {

  it("Default logs",() => {

    const loggerFactory = LFService.createLoggerFactory(new LoggerFactoryOptions().addLogGroupRule(new LogGroupRule(new RegExp("Hello.+"),LogLevel.Info, new LogFormat(), LoggerType.MessageBuffer)));
    const tmpLogger = loggerFactory.getLogger("Hello1");

    expect(tmpLogger instanceof MessageBufferLoggerImpl).toBeTruthy();

    const logger = <MessageBufferLoggerImpl>tmpLogger;
    let messages: string[] = logger.getMessages();
    expect(messages.length).toEqual(0);

    logger.info("Dance!");

    expect(messages.length).toEqual(1);
    expect(messages[0]).toContain("Dance!");
    expect(messages[0]).toContain("INFO");

    logger.warn("This is a warning!");
    expect(messages.length).toEqual(2);
    expect(messages[1]).toContain("This is a warning!");
    expect(messages[1]).toContain("WARN");

    // Error stack is constructed async, hence we do this async in the test.
    logger.error("Serious trouble!", new Error("Oops!"));
    waitsFor(() => messages.length == 3, "Expected 3 messages in log", 3000);
    runs(() => {
      expect(messages[2]).toContain("Serious trouble!");
      expect(messages[2]).toContain("ERROR");
      expect(messages[2]).toContain("Oops!");
    });

  });

  it("Can use custom logger", () => {
    const loggerOptions = new LoggerFactoryOptions().addLogGroupRule(new LogGroupRule(new RegExp("Hello.+"),LogLevel.Info, new LogFormat(), LoggerType.Custom,
      (name: string, logGroupRule: LogGroupRule) => new CustomLoggerImpl(name, logGroupRule)
    ));

    const loggerFactory = LFService.createLoggerFactory(loggerOptions);
    const logger = loggerFactory.getLogger("Hello.Special.Bla");
    expect(logger instanceof CustomLoggerImpl).toBeTruthy();

    logger.info("Hello world");

    const castLogger = <CustomLoggerImpl>logger;

    expect(castLogger.message).toContain("Hello world");

    const sameLogger = loggerFactory.getLogger("Hello.Special.Bla");
    expect(castLogger === sameLogger).toBeTruthy();

    const otherLogger = <CustomLoggerImpl>loggerFactory.getLogger("Hello.Other");
    expect(sameLogger === otherLogger).toBeFalsy();

    otherLogger.info("Test");
    expect(otherLogger.message).toContain("Test");

    // The other one should still have hello world
    expect(castLogger.message).toContain("Hello world");
  });

  it("Can use closures for logging", () => {
    const loggerFactory = LFService.createLoggerFactory(new LoggerFactoryOptions().addLogGroupRule(new LogGroupRule(new RegExp(".+"),LogLevel.Info, new LogFormat(), LoggerType.MessageBuffer)));
    const logger = <MessageBufferLoggerImpl>loggerFactory.getLogger("ABC");

    logger.infoc(() => "Hello");

    expect(logger.toString()).toContain("Hello");

    // Should not log!
    logger.debugc(() => "NotMe!");
    expect(logger.toString()).not.toContain("NotMe!");

    // Should log
    logger.errorc(() => "YesMe!", () => new Error("Failed"));
    waitsFor(() => logger.getMessages().length == 2, "Should have 2 messages by now", 3000);
    runs(() => {
      expect(logger.toString()).toContain("YesMe!");
      expect(logger.toString()).toContain("Failed");
    });
  });

});