export type TFunctionQueueResolve<T> = (v?: T) => void
export type TFunctionQueueReject<T> = (e?: any, v?: T) => void
export type TFunctionQueueOnResolveAsync<T> = (v: T, resolve: TFunctionQueueResolve<T>, reject: TFunctionQueueReject<T>) => void
export type TFunctionQueueOnResolveSync<T> = (v: T) => T | undefined | void
export type TFunctionQueueOnRejectAsync<T> = (e: any, v: T, resolve: TFunctionQueueResolve<T>, reject: TFunctionQueueReject<T>) => void
export type TFunctionQueueOnRejectSync<T> = (e: any, v: T) => T | undefined | void

export class FunctionQueueItem {
	isAsync: boolean
	isFinal: boolean
	defer: boolean
	constructor(o: { isAsync?: boolean, isFinal?: boolean, defer?: boolean } = {}) {
		this.isAsync = !!o.isAsync
		this.isFinal = !!o.isFinal
		this.defer = !!o.defer
	}
}
export class FunctionQueueItemOnResolve extends FunctionQueueItem { }
export class FunctionQueueItemOnResolveAsync<T> extends FunctionQueueItemOnResolve {
	f: TFunctionQueueOnResolveAsync<T>
	constructor(o: { f: TFunctionQueueOnResolveAsync<T>, defer?: boolean }) {
		super({ isAsync: true, defer: o.defer })
		this.f = o.f
	}
}
export class FunctionQueueItemOnResolveSync<T> extends FunctionQueueItemOnResolve {
	f: TFunctionQueueOnResolveSync<T>
	constructor(o: { f: TFunctionQueueOnResolveSync<T>, defer?: boolean }) {
		super({ defer: o.defer })
		this.f = o.f
	}
}
export class FunctionQueueItemOnReject extends FunctionQueueItem { }
export class FunctionQueueItemOnRejectAsync<T> extends FunctionQueueItemOnReject {
	f: TFunctionQueueOnRejectAsync<T>
	constructor(o: { f: TFunctionQueueOnRejectAsync<T>, defer?: boolean, isFinal?: boolean }) {
		super({ isAsync: true, defer: o.defer, isFinal: o.isFinal })
		this.f = o.f
	}
}
export class FunctionQueueItemOnRejectSync<T> extends FunctionQueueItemOnReject {
	f: TFunctionQueueOnRejectSync<T>
	constructor(o: { f: TFunctionQueueOnRejectSync<T>, defer?: boolean, isFinal?: boolean }) {
		super({ defer: o.defer, isFinal: o.isFinal })
		this.f = o.f
	}
}

export class FunctionQueue<T = any> {

	private _name?: string
	private _value: T
	private _error: any
	private _items: FunctionQueueItem[] = []
	private _isAwaitingCallback = false
	private _isInProcessLoop = false
	private _isStarted = false
	private _isFinalized = false
	private _errorWarningRef: any

	constructor(o: {
		name?: string,
		value: T,
	}) {
		this.log('constructor', o)
		this._name = o.name
		this._value = o.value
	}
	onValueDoWithCallback(f: TFunctionQueueOnResolveAsync<T>, o: { defer?: boolean } = {}) {
		this.add(new FunctionQueueItemOnResolveAsync({
			f,
			defer: o.defer,
		}))
		return this
	}
	afterValueDoWithCallback(f: TFunctionQueueOnResolveAsync<T>) {
		return this.onValueDoWithCallback(f, { defer: true })
	}
	onValue(f: TFunctionQueueOnResolveSync<T>, o: { defer?: boolean } = {}) {
		this.add(new FunctionQueueItemOnResolveSync({
			f,
			defer: o.defer,
		}))
		return this
	}
	afterValue(f: TFunctionQueueOnResolveSync<T>) {
		return this.onValue(f, { defer: true })
	}
	onErrorDoWithCallback(f: TFunctionQueueOnRejectAsync<T>, o: { defer?: boolean } = {}) {
		this.add(new FunctionQueueItemOnRejectAsync({
			f,
			defer: o.defer,
		}))
		return this
	}
	afterErrorDoWithCallback(f: TFunctionQueueOnRejectAsync<T>) {
		return this.onErrorDoWithCallback(f, { defer: true })
	}
	onError(f: TFunctionQueueOnRejectSync<T>, o: { defer?: boolean } = {}) {
		this.add(new FunctionQueueItemOnRejectSync({
			f,
			defer: o.defer,
		}))
		return this
	}
	afterError(f: TFunctionQueueOnRejectSync<T>) {
		return this.onError(f, { defer: true })
	}
	onFinishedDoWithCallback(f: TFunctionQueueOnRejectAsync<T>, o: { defer?: boolean } = {}) {
		this.add(new FunctionQueueItemOnRejectAsync({
			f,
			isFinal: true,
			defer: o.defer,
		}))
		return this
	}
	afterFinishedDoWithCallback(f: TFunctionQueueOnRejectAsync<T>) {
		return this.onFinishedDoWithCallback(f, { defer: true })
	}
	onFinished(f: TFunctionQueueOnRejectSync<T>, o: { defer?: boolean, atEnd?: boolean } = {}) {
		this.add(new FunctionQueueItemOnRejectSync({
			f,
			isFinal: true,
			defer: o.defer,
		}), {
			atEnd: o.atEnd,
		})
		return this
	}
	afterFinished(f: TFunctionQueueOnRejectSync<T>, o: { defer?: boolean, atEnd?: boolean } = {}) {
		return this.onFinished(f, { defer: true, ...o })
	}
	start() {
		this.log('start isStarted:', this._isStarted)
		if (!this._isStarted) {
			this._isStarted = true
			this.process()
		}
		return this
	}
	protected add(item: FunctionQueueItem, o: { atEnd?: boolean } = {}) {
		if (this._isFinalized && (!item.isFinal || !o.atEnd)) {
			throw new Error(`Adding non-final item to finalized FunctionQueue.`)
		}
		let index = this._items.length
		if (!o.atEnd) {
			for (; index > 0; index--) {
				if (!this._items[index - 1].isFinal) {
					break
				}
			}
		}
		this.log('add index:', index, 'item:', item)
		this._items.splice(index, 0, item)
		if (this._isStarted && !this.isProcessing()) {
			this.process()
		}
	}
	protected process() {
		this.log('process isInProcessLoop:', this._isInProcessLoop, 'isAwaitingCallback:', this._isAwaitingCallback)
		if (!this.isProcessing()) {
			clearTimeout(this._errorWarningRef)
			this._isInProcessLoop = true
			while (this._items.length) {
				this.execFunction(this._items.shift()!)
				if (this._isAwaitingCallback) {
					this._isInProcessLoop = false
					return this
				}
			}
			this._isInProcessLoop = false
			if (this._error) {
				this._errorWarningRef = setTimeout(() => console.error('Unhandled error in FunctionQueue:', this._error))
			}
		}
		return this
	}
	protected isProcessing() {
		return this._isInProcessLoop || this._isAwaitingCallback
	}
	protected execFunction(item: FunctionQueueItem) {
		this.log('execFunction item:', item)
		this._isAwaitingCallback = false
		try {
			let hasError = typeof this._error !== 'undefined'
			if (item instanceof FunctionQueueItemOnResolveAsync) {
				if (!hasError) {
					this._isAwaitingCallback = true
					if (item.defer) {
						setTimeout(() => {
							item.f(this._value, v => this.resolve(v), (e, v) => this.reject(e, v))
						}, 0)
					} else {
						item.f(this._value, v => this.resolve(v), (e, v) => this.reject(e, v))
					}
				}
			} else if (item instanceof FunctionQueueItemOnResolveSync) {
				if (!hasError) {
					if (item.defer) {
						this._isAwaitingCallback = true
						setTimeout(() => {
							try {
								this.resolve(item.f(this._value))
							} catch (e) {
								this.reject(e, this._value)
							}
						}, 0)
					} else {
						this.setValueIfDefined(item.f(this._value))
					}
				}
			} else if (item instanceof FunctionQueueItemOnRejectAsync) {
				if (item.isFinal) {
					this._isFinalized = true
					this.callOnRejectAsync(item)
				} else {
					if (hasError) {
						this.callOnRejectAsync(item)
					}
				}
			} else if (item instanceof FunctionQueueItemOnRejectSync) {
				if (item.isFinal) {
					this._isFinalized = true
					this.callOnRejectSync(item)
				} else {
					if (hasError) {
						this.callOnRejectSync(item)
					}
				}
			} else {
				throw new Error('Invalid item.')
			}
		} catch (e) {
			this.reject(e, this._value)
			return
		}
	}
	protected callOnRejectAsync(item: FunctionQueueItemOnRejectAsync<T>) {
		let e = this._error
		this._error = undefined
		this._isAwaitingCallback = true
		if (item.defer) {
			setTimeout(() => {
				item.f(e, this._value, v => this.resolve(v!), (e, v) => this.reject(e, v!))
			}, 0)
		} else {
			item.f(e, this._value, v => this.resolve(v!), (e, v) => this.reject(e, v!))
		}
	}
	protected callOnRejectSync(item: FunctionQueueItemOnRejectSync<T>) {
		let e = this._error
		this._error = undefined
		if (item.defer) {
			this._isAwaitingCallback = true
			setTimeout(() => {
				try {
					this.resolve(item.f(e, this._value)!)
				} catch (e) {
					this.reject(e, this._value)
				}
			}, 0)
		} else {
			this.setValueIfDefined(item.f(e, this._value)!)
		}
	}
	protected resolve(value?: T) {
		this.log('resolve value:', value)
		this.setValueIfDefined(value)
		this.afterResolve()
	}
	protected reject(e?: any, value?: T) {
		this.log('reject e:', e)
		this._error = e
		this.setValueIfDefined(value)
		this.afterResolve()
	}
	protected afterResolve() {
		this._isAwaitingCallback = false
		this.process()
	}
	getError() {
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
	protected log(...rest: any[]) {
		if (this._name) {
			console.log(this._name + ':', ...rest)
		}
	}
}