export type TFunQResolve<T> = (v?: T) => void
export type TFunQReject<T> = (e?: any, v?: T) => void
export type TFunQOnResolveAsync<T> = (v: T, resolve: TFunQResolve<T>, reject: TFunQReject<T>) => void
export type TFunQOnRejectAsync<T> = (e: any, v: T, resolve: TFunQResolve<T>, reject: TFunQReject<T>) => void

export class FunQItem {
	handlesBoth: boolean
	isFinal: boolean
	defer: boolean
	constructor(o: { isFinal?: boolean, defer?: boolean, handlesBoth?: boolean } = {}) {
		this.isFinal = !!o.isFinal
		this.defer = !!o.defer
		this.handlesBoth = this.isFinal || !!o.handlesBoth
	}
}
export class FunQItemOnResolve<T> extends FunQItem {
	f: TFunQOnResolveAsync<T>
	constructor(o: { f: TFunQOnResolveAsync<T>, defer?: boolean }) {
		super({ defer: o.defer })
		this.f = o.f
	}
}
export class FunQItemOnReject<T> extends FunQItem {
	f: TFunQOnRejectAsync<T>
	constructor(o: { f: TFunQOnRejectAsync<T>, defer?: boolean, isFinal?: boolean, handlesBoth?: boolean }) {
		super({ defer: o.defer, isFinal: o.isFinal, handlesBoth: o.handlesBoth })
		this.f = o.f
	}
}

export class FunQ<T = any> {

	// private _name?: string
	private _value: T
	private _error: any
	private _items: FunQItem[] = []
	private _isAwaitingCallback = false
	private _isInProcessLoop = false
	private _isStarted = false
	private _isFinalized = false
	private _hasWaitedForFinalize = false
	private _dontDelayFinalize: boolean
	private _errorWarningRef: any
	private _item: FunQItem | undefined

	constructor(o: {
		// name?: string,
		value?: T,
		dontDelayFinalize?: boolean,
		dontStart?: boolean,
	} = {}) {
		// this.log('constructor', o)
		// this._name = o.name
		if (typeof o.value !== 'undefined') {
			this._value = o.value
		}
		this._dontDelayFinalize = !!o.dontDelayFinalize
		if (!o.dontStart) this.start()
	}
	onValue(f: TFunQOnResolveAsync<T>, o: { defer?: boolean } = {}) {
		this.add(new FunQItemOnResolve({
			f,
			defer: o.defer,
		}))
		return this
	}
	afterValue(f: TFunQOnResolveAsync<T>) {
		return this.onValue(f, { defer: true })
	}
	onError(f: TFunQOnRejectAsync<T>, o: { defer?: boolean } = {}) {
		this.add(new FunQItemOnReject({
			f,
			defer: o.defer,
		}))
		return this
	}
	afterError(f: TFunQOnRejectAsync<T>) {
		return this.onError(f, { defer: true })
	}
	onErrorOrValue(f: TFunQOnRejectAsync<T>, o: { defer?: boolean } = {}) {
		this.add(new FunQItemOnReject({
			f,
			handlesBoth: true,
			defer: o.defer,
		}))
		return this
	}
	afterErrorOrValue(f: TFunQOnRejectAsync<T>) {
		return this.onErrorOrValue(f, { defer: true })
	}
	onFinished(f: TFunQOnRejectAsync<T>, o: { defer?: boolean, atEnd?: boolean } = {}) {
		this.add(new FunQItemOnReject({
			f,
			isFinal: true,
			defer: o.defer,
		}), {
				atEnd: o.atEnd,
			})
		return this
	}
	afterFinished(f: TFunQOnRejectAsync<T>, o: { defer?: boolean, atEnd?: boolean } = {}) {
		return this.onFinished(f, { defer: true, ...o })
	}
	start() {
		// this.log('start isStarted:', this._isStarted)
		if (!this._isStarted) {
			this._isStarted = true
			this.process()
		}
		return this
	}
	protected add(item: FunQItem, o: { atEnd?: boolean } = {}) {
		if (this._isFinalized && (!item.isFinal || !o.atEnd)) {
			throw new Error(`Adding non-final item to finalized FunQ.`)
		}
		let index = this._items.length
		if (!o.atEnd) {
			for (; index > 0; index--) {
				if (!this._items[index - 1].isFinal) {
					break
				}
			}
		}
		// this.log('add index:', index, 'item:', item)
		this._items.splice(index, 0, item)
		if (this._isStarted && !this.isProcessing()) {
			this.process()
		}
	}
	protected process() {
		// this.log('process isInProcessLoop:', this._isInProcessLoop, 'isAwaitingCallback:', this._isAwaitingCallback)
		if (!this.isProcessing()) {
			clearTimeout(this._errorWarningRef)
			this._isInProcessLoop = true
			while (this._items.length) {
				this.execFunction()
				if (this._isAwaitingCallback) {
					this._isInProcessLoop = false
					return this
				}
			}
			this._isInProcessLoop = false
			if (this._error) {
				this._errorWarningRef = setTimeout(() => console.error('Unhandled error in FunQ:', this._error))
			}
		}
		return this
	}
	protected isProcessing() {
		return this._isInProcessLoop || this._isAwaitingCallback
	}
	protected execFunction() {
		const item = this._items[0]
		if (!this._dontDelayFinalize) {
			if (item) {
				if (item.isFinal) {
					if (!this._hasWaitedForFinalize) {
						this.add(new FunQItemOnReject<T>({
							defer: true,
							f: (e, v, resolve, reject) => {
								// this.log(`_hasWaitedForFinalize e:`, e, `v:`, v)
								this._hasWaitedForFinalize = true
								if (e) reject(e)
								else resolve()
							},
							handlesBoth: true,
							isFinal: false,
						}))
						return
					}
				} else {
					this._hasWaitedForFinalize = false
				}
			}
		}
		this._items.shift()
		// this.log('execFunction item:', item)
		this._item = item
		this._isAwaitingCallback = false
		try {
			let hasError = typeof this._error !== 'undefined'
			if (item instanceof FunQItemOnResolve) {
				if (!hasError) {
					this._isAwaitingCallback = true
					if (item.defer) {
						setTimeout(() => {
							try {
								item.f(this._value, this.getResolveForItem(item), this.getRejectForItem(item))
							} catch (e) {
								this.reject(e)
							}
						}, 0)
					} else {
						item.f(this._value, this.getResolveForItem(item), this.getRejectForItem(item))
					}
				}
			} else if (item instanceof FunQItemOnReject) {
				if (item.isFinal) {
					this._isFinalized = true
				}
				if (item.isFinal || item.handlesBoth || hasError) {
					let e = this._error
					this._error = undefined
					this._isAwaitingCallback = true
					if (item.defer) {
						setTimeout(() => {
							try {
								item.f(e, this._value, this.getResolveForItem(item), this.getRejectForItem(item))
							} catch (e) {
								this.reject(e)
							}
						}, 0)
					} else {
						item.f(e, this._value, this.getResolveForItem(item), this.getRejectForItem(item))
					}
				}
			} else {
				throw new Error('Invalid item.')
			}
		} catch (e) {
			this.reject(e, this._value)
		}
	}
	protected resolve(value?: T) {
		// this.log('resolve value:', value)
		this.setValueIfDefined(value)
		this.afterResolve()
	}
	protected reject(e?: any, value?: T) {
		// this.log('reject e:', e)
		this._error = e || new Error()
		this.setValueIfDefined(value)
		this.afterResolve()
	}
	protected afterResolve() {
		this._isAwaitingCallback = false
		this._item = undefined
		this.process()
	}
	protected getResolveForItem(item: FunQItem): TFunQResolve<T> {
		return v => {
			if (this._item === item) {
				this.resolve(v)
			}
		}
	}
	protected getRejectForItem(item: FunQItem): TFunQReject<T> {
		return (e, v) => {
			if (this._item === item) {
				this.reject(e, v)
			}
		}
	}
	getError() {
		clearTimeout(this._errorWarningRef)
		return this._error
	}
	isStarted() {
		return this._isStarted
	}
	isFinalized() {
		return this._isFinalized
	}
	getValue(): T {
		return this._value
	}
	protected setValueIfDefined(value?: T) {
		if (typeof value !== 'undefined') {
			this._value = value
		}
	}
	// protected log(...rest: any[]) {
	// 	if (this._name) {
	// 		console.log(this._name + ':', ...rest)
	// 	}
	// }
}