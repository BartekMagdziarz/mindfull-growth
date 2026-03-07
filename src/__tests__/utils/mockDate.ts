const RealDate = Date

export function mockDate(isoTimestamp: string) {
  const fixed = new RealDate(isoTimestamp)

  class MockDate extends RealDate {
    constructor(...args: ConstructorParameters<typeof RealDate> | []) {
      if (args.length === 0) {
        super(fixed.getTime())
      } else {
        super(...(args as ConstructorParameters<typeof RealDate>))
      }
    }

    static now() {
      return fixed.getTime()
    }
  }

  globalThis.Date = MockDate as DateConstructor

  return () => {
    globalThis.Date = RealDate
  }
}
