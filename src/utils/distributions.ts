export class DiscreteDistributionHelper {
  private _currentTime: number = 0
  private _timeStep: number
  private _distribution: Distribution

  constructor(distr: Distribution, timeStep: number = 1) {
    this._distribution = distr
    this._timeStep = timeStep
  }

  private _probabilityInTimeRange(): number {
    return this._distribution.getProbabilityInTimeRange(
      this._currentTime,
      this._currentTime + this._timeStep,
    )
  }

  private _getNextProbability(): number {
    const probability = this._probabilityInTimeRange()
    this._currentTime += this._timeStep
    return probability
  }

  getNextRandomResult(): boolean {
    const probability = this._getNextProbability()
    return Math.random() < probability
  }

  reset(): void {
    this._currentTime = 0
  }
}

export class ContinuousDistributionHelper {
  private _distribution: Distribution

  constructor(distr: Distribution) {
    this._distribution = distr
  }

  getNextRandomResult(): number {
    return this._distribution.getQuantile(Math.random())
  }
}

export abstract class Distribution {
  protected _params: any[]

  constructor(...params: any) {
    this._params = params

    this._params.map((param: any) => {
      if (typeof param !== 'number') {
        throw new Error('Distribution: params must be numbers')
      }
      return param
    })
  }

  protected _distrCdf(x: number, ...params: number[]): number {
    if (typeof x !== 'number') {
      throw new Error('Distribution: x must be a number')
    }

    return 0
  }

  protected _distrQuantile(p: number, ...params: number[]): number {
    if (typeof p !== 'number') {
      throw new Error('Distribution: p must be a number')
    }

    if (p < 0 || p > 1) {
      throw new Error('ExponentialDistr: p must be in range [0, 1]')
    }

    return 0
  }

  getProbabilityInTimeRange(x1: number, x2: number): number {
    return this._distrCdf(x2, ...this._params) - this._distrCdf(x1, ...this._params)
  }

  getQuantile(p: number): number {
    return this._distrQuantile(p, ...this._params)
  }
}

export class LinearDistr extends Distribution {
  constructor(a: number, b: number) {
    super(a, b)
  }

  protected _distrCdf(x: number, a: number, b: number): number {
    super._distrCdf(x, a, b)

    if (a > b) {
      throw new Error('LinearDistr: a must be less than b')
    }

    if (x < a) {
      return 0
    }

    if (x > b) {
      return 1
    }

    return (x - a) / (b - a)
  }

  protected _distrQuantile(p: number, a: number, b: number): number {
    super._distrQuantile(p, a, b)

    if (a > b) {
      throw new Error('LinearDistr: a must be less than b')
    }

    return a + p * (b - a)
  }
}

export class ExponentialDistr extends Distribution {
  constructor(lambda: number) {
    super(lambda)
  }

  protected _distrCdf(x: number, lambda: number): number {
    super._distrCdf(x, lambda)

    if (x < 0) {
      return 0
    }

    if (lambda <= 0) {
      throw new Error('ExponentialDistr: lambda must be greater than 0')
    }

    return 1 - Math.exp(-lambda * x)
  }

  protected _distrQuantile(p: number, lambda: number): number {
    super._distrQuantile(p, lambda)

    if (lambda <= 0) {
      throw new Error('ExponentialDistr: lambda must be greater than 0')
    }

    return -Math.log(1 - p) / lambda
  }
}
