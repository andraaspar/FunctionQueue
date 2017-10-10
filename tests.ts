import { FunQ, TFunQResolve } from './index'

describe('FunQ', () => {
	describe('instance', () => {
		it('Can be passed a value.', () => {

			let q = new FunQ({
				value: 42,
			})

			expect(q.getValue()).toBe(42)
		})
		it('Can be started.', () => {

			let q = new FunQ({
				value: 42,
				dontStart: true,
			})

			expect(q.isStarted()).toBe(false, 'Not started by default.')

			q.start()

			expect(q.isStarted()).toBe(true, 'Started after a call to start.')
		})
		it('Can be finalized.', () => {

			let q = new FunQ({
				value: 42,
				dontDelayFinalize: true,
			})

			expect(q.isFinalized()).toBe(false, 'Not finalized by default.')

			q.onFinished(() => { })

			expect(q.isFinalized()).toBe(true, 'Finalized after onFinished.')
		})
	})
	describe('onValue', () => {
		it('Receives value and can change it.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue((v, resolve) => {
					expect(v).toBe(42, 'Value should be received in onValue.')
					resolve(111)
				})

			expect(q.getValue()).toBe(111, 'The value from onValue should be received.')
		})
		it('Receives value and can leave it as is.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue((v, resolve) => {
					expect(v).toBe(42, 'Value should be received in onValue.')
					resolve()
				})

			expect(q.getValue()).toBe(42, 'The original value should be received.')
		})
		it('Does not change the value when throwing an error in onValue.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onError((e, v, resolve) => {
					expect(e).toBe('error', 'The error should be received.')
					expect(v).toBe(42, 'The value should be received.')
					resolve(111)
				})

			expect(q.getValue()).toBe(111, 'The value from onError should be received.')
		})
		it('May resolve null to unset value.', () => {

			let q = new FunQ<{} | null>({
				value: {},
			})
				.onValue((v, resolve) => {
					resolve(null)
				})

			expect(q.getValue()).toBeNull()
		})
		it('May resolve undefined to leave value unchanged.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue((v, resolve) => {
					resolve(undefined)
				})

			expect(q.getValue()).toBe(42)
		})
		it('May set defer to postpone execution till after the current function.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.onValue((v, resolve) => {
					expect(v).toBe(42)
					resolve(111)
					done()
				}, { defer: true })

			expect(q.getValue()).toBe(42)
		})
		it('Stacks onValue calls.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue((v, resolve) => {
					expect(v).toBe(42, 'The original value should be received.')
					resolve(111)
				})
				.onValue((v, resolve) => {
					expect(v).toBe(111, 'The value from 1st onValue should be received.')
					resolve(222)
				})
				.onValue((v, resolve) => {
					expect(v).toBe(222, 'The value from 2nd onValue should be received.')
					resolve(333)
				})

			expect(q.getValue()).toBe(333, 'The value from 3rd onValue should be received.')
		})
		it('Skips onValue when there’s an error.', () => {

			let onValue = jasmine.createSpy('onValue')

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onValue(onValue)

			expect(q.getError()).toBe('error', 'The error should be received.')
			expect(q.getValue()).toBe(42, 'The original value should be received.')
			expect(onValue).not.toHaveBeenCalled()
		})
		it('Shows an error in console after an unhandled error.', (done) => {

			let consoleError = spyOn(console, 'error')

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})

			setTimeout(() => {
				expect(consoleError).toHaveBeenCalledTimes(1)
				done()
			}, 10)
		})
		it('May resolve immediately.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue((v, resolve) => {
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})

			expect(q.getError()).toBeUndefined('Should not receive an error.')
			expect(q.getValue()).toBe(111, 'Should receive the value from onValue.')
		})
		it('May not reject after it resolved.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue((v, resolve, reject) => {
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
					reject('error')
				})

			expect(q.getError()).toBeUndefined('Should not receive an error.')
			expect(q.getValue()).toBe(111, 'Should receive the value from onValue.')
		})
		it('May not resolve after it’s been rejected.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue((v, resolve, reject) => {
					expect(v).toBe(42, 'Should receive the value.')
					reject('error')
					resolve(111)
				})

			expect(q.getError()).toBe('error', 'Should receive the error.')
			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May reject with no error.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue((v, resolve, reject) => {
					expect(v).toBe(42, 'Should receive the value.')
					reject()
				})

			expect(q.getError()).toEqual(new Error(), 'Should receive an error.')
			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May throw.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue((v, resolve, reject) => {
					throw 'error'
				})

			expect(q.getError()).toEqual('error', 'Should receive error.')
			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
	})
	describe('afterValue', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.afterValue((v, resolve) => {
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterValue.')
					done()
				})

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.afterValue(v => {
					throw 'error'
				})
				.onFinished((e, v) => {
					expect(e).toBe('error', 'Should receive the error from afterValue.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
		})
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.afterValue((v, resolve, reject) => {
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterValue.')
					done()
				})

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May reject.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.afterValue((v, resolve, reject) => {
					reject('error')
				})
				.onFinished((e, v) => {
					expect(e).toBe('error', 'Should receive the error from afterValue.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.afterValue((v, resolve, reject) => {
					throw 'error'
				})
				.onFinished((e, v) => {
					expect(e).toBe('error', 'Should receive the error from afterValue.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
		})
	})
	describe('onError', () => {
		it('Will not be called if there’s no error.', () => {

			let onError = jasmine.createSpy('onError')

			let q = new FunQ({
				value: 42,
			})
				.onError(onError)

			expect(onError).not.toHaveBeenCalled()
		})
		it('Will be called if there’s an error.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onError((e, v, resolve) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})

			expect(q.getValue()).toBe(111, 'Should receive the value from onError.')
		})
		it('Will not be called if there’s no error.', () => {

			let onError = jasmine.createSpy('onError')

			let q = new FunQ({
				value: 42,
			})
				.onError(onError)

			expect(onError).not.toHaveBeenCalled()
		})
		it('Will be called if there’s an error.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onError((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})

			expect(q.getValue()).toBe(111, 'Should receive the value from onError.')
		})
		it('May reject immediately.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error 1'
				})
				.onError((e, v, resolve, reject) => {
					reject('error 2')
				})
				.onFinished((e, v) => {
					expect(e).toBe('error 2', 'Should receive the error from onError.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error 1'
				})
				.onError((v, resolve, reject) => {
					throw 'error 2'
				})
				.onFinished((e, v) => {
					expect(e).toBe('error 2', 'Should receive the error from onError.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
		})
	})
	describe('afterError', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.afterError((e, v, resolve) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterValue.')
					done()
				})

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error 1'
				})
				.afterError((e, v) => {
					throw 'error 2'
				})
				.onFinished((e, v) => {
					expect(e).toBe('error 2', 'Should receive the error from afterError.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
		})
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(() => {
					throw 'error'
				})
				.afterError((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterError.')
					done()
				})

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error 1'
				})
				.afterError((e, v, resolve, reject) => {
					throw 'error 2'
				})
				.onFinished((e, v) => {
					expect(e).toBe('error 2', 'Should receive the error from afterError.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
		})
	})
	describe('onErrorOrValue', () => {
		it('Receives values.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onErrorOrValue((e, v, resolve) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})

			expect(q.getValue()).toBe(111, 'The value from onErrorOrValue should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onErrorOrValue((e, v, resolve) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})

			expect(q.getValue()).toBe(111, 'The value from onErrorOrValue should be received.')
		})
		it('Receives values.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onErrorOrValue((e, v, resolve, reject) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})

			expect(q.getValue()).toBe(111, 'The value from onErrorOrValue should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onErrorOrValue((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})

			expect(q.getValue()).toBe(111, 'The value from onErrorOrValue should be received.')
		})
	})
	describe('afterErrorOrValue', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.afterErrorOrValue((e, v, resolve) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterErrorOrValue.')
					done()
				})

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.onValue(() => {
					throw 'error'
				})
				.afterErrorOrValue((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterErrorOrValue .')
					done()
				})

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
	})
	describe('onFinished', () => {
		it('Supports onFinished.', () => {

			let q = new FunQ({
				value: 42,
				dontDelayFinalize: true,
			})
				.onFinished((e, v, resolve) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})

			expect(q.getValue()).toBe(111, 'The value from onFinished should be received.')
		})
		it('Supports not returning a value from onFinished.', () => {

			let q = new FunQ({
				value: 42,
				dontDelayFinalize: true,
			})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(v).toBe(42, 'Value should be received.')
				})

			expect(q.getValue()).toBe(42, 'The original value should be received.')
		})
		it('Can splice functions before onFinished.', () => {

			let q = new FunQ({
				value: 42,
				dontStart: true,
				dontDelayFinalize: true,
			})
				.onFinished((e, v, resolve) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(v).toBe(333, 'Value from 3rd onValue should be received.')
					resolve(444)
				})
				.onValue(v => {
					expect(v).toBe(42, 'Value should be received.')
					throw 'error 1'
				})
				.onErrorOrValue((e, v) => {
					expect(e).toBe('error 1', 'The error from onValue should be received.')
					expect(v).toBe(42, 'Value from 1st onValue should be received.')
					throw 'error 2'
				})
				.onError((e, v, resolve) => {
					expect(e).toBe('error 2', 'The error from onErrorOrValue should be received.')
					expect(v).toBe(42, 'Value from 2nd onValue should be received.')
					resolve(333)
				})
				.start()

			expect(q.getValue()).toBe(444, 'The value from onFinished should be received.')
		})
		it('onFinished stacks in reverse.', () => {

			let q = new FunQ({
				value: 42,
				dontStart: true,
				dontDelayFinalize: true,
			})
				.onFinished((e, v, resolve) => {
					expect(e).toBeUndefined('No error should occur 3.')
					expect(v).toBe(222, 'Value from 2nd onFinished should be received.')
					resolve(333)
				})
				.onFinished((e, v, resolve) => {
					expect(e).toBeUndefined('No error should occur 2.')
					expect(v).toBe(111, 'Value from 1st onFinished should be received.')
					resolve(222)
				})
				.onFinished((e, v, resolve) => {
					expect(e).toBeUndefined('No error should occur 1.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})
				.start()

			expect(q.getValue()).toBe(333, 'The value from 3rd onFinished should be received.')
		})
		it('onFinished supports atEnd.', () => {
			let q = new FunQ({
				value: 42,
				dontStart: true,
				dontDelayFinalize: true,
			})
				.onFinished((e, v, resolve) => {
					expect(e).toBeUndefined('No error should occur 1.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				}, { atEnd: true })
				.onFinished((e, v, resolve) => {
					expect(e).toBeUndefined('No error should occur 2.')
					expect(v).toBe(111, 'Value from 1st onFinished should be received.')
					resolve(222)
				}, { atEnd: true })
				.onFinished((e, v, resolve) => {
					expect(e).toBeUndefined('No error should occur 3.')
					expect(v).toBe(222, 'Value from 2nd onFinished should be received.')
					resolve(333)
				}, { atEnd: true })
				.start()

			expect(q.getValue()).toBe(333, 'The value from 3rd onFinished should be received.')
		})
		it('Can’t prepend onFinished after finalized.', () => {

			let q = new FunQ({
				value: 42,
				dontDelayFinalize: true,
			})
				.onFinished(() => { })

			expect(() => q.onFinished(() => { })).toThrowError(/finalized/)
		})
		it('Can append onFinished after finalized.', () => {

			let q = new FunQ({
				value: 42,
				dontDelayFinalize: true,
			})
				.onFinished((e, v, resolve) => resolve(111))

			expect(() => q.onFinished((e, v, resolve) => resolve(222), { atEnd: true })).not.toThrow()
			expect(q.getValue()).toBe(222, 'The value from the appended onFinished should be received.')
		})
		it('Can delay finalizing.', (done) => {

			let q = new FunQ({
				value: 42,
			})
				.onFinished((e, v, resolve) => {
					expect(v).toBe(222, 'The value from onValue should be received.')
					resolve(333)
				})
				.onValue((v, resolve) => {
					expect(v).toBe(42, 'The original value should be received.')
					resolve(111)
				})
				.onFinished((e, v, resolve) => {
					expect(v).toBe(111, 'The value from onValue should be received.')
					resolve(222)
				})
				.onFinished((e, v) => {
					expect(v).toBe(333, 'The value from the first onFinished should be received.')
					done()
				}, { atEnd: true })
		})
		it('Receives values.', () => {

			let q = new FunQ({
				value: 42,
				dontDelayFinalize: true,
			})
				.onFinished((e, v, resolve, reject) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})

			expect(q.getValue()).toBe(111, 'The value from onFinished should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunQ({
				value: 42,
				dontDelayFinalize: true,
			})
				.onValue(v => {
					throw 'error'
				})
				.onFinished((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})

			expect(q.getValue()).toBe(111, 'The value from onFinished should be received.')
		})
	})
	describe('afterFinished', () => {
		it('Runs after current function.', (done) => {

			let afterFinished = jasmine.createSpy('afterFinished', (e: any, v: number, resolve: TFunQResolve<number>) => {
				expect(e).toBeUndefined('No error should occur 1.')
				expect(v).toBe(42, 'Value should be received.')
				done()
				resolve(111)
			}).and.callThrough()

			let q = new FunQ({
				value: 42,
				dontDelayFinalize: true,
			})
				.afterFinished(afterFinished)

			expect(q.getValue()).toBe(42, 'The original value should be received.')
			expect(afterFinished).not.toHaveBeenCalled()
		})
		it('Works if added after start.', (done) => {

			let afterFinished = jasmine.createSpy('afterFinished', (e: any, v: number, resolve: TFunQResolve<number>) => {
				expect(e).toBeUndefined('No error should occur 1.')
				expect(v).toBe(42, 'Value should be received.')
				done()
				resolve(111)
			}).and.callThrough()

			let q = new FunQ({
				value: 42,
				dontStart: true,
				dontDelayFinalize: true,
			})
				.start()
				.afterFinished(afterFinished)

			expect(q.getValue()).toBe(42, 'The original value should be received.')
			expect(afterFinished).not.toHaveBeenCalled()
		})
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: 42,
				dontDelayFinalize: true,
			})
				.onValue(() => {
					throw 'error'
				})
				.afterFinished((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterFinished.')
					done()
				}, { atEnd: true })

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
	})
})