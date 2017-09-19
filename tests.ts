import { FunctionQueue } from './index'

describe('FunctionQueue', () => {
	describe('instance', () => {
		it('Can be passed a value.', () => {

			let q = new FunctionQueue({
				value: 42,
			})

			expect(q.getValue()).toBe(42)
		})
		it('Can be started.', () => {

			let q = new FunctionQueue({
				value: 42,
			})

			expect(q.isStarted()).toBe(false, 'Not started by default.')

			q.start()

			expect(q.isStarted()).toBe(true, 'Started after a call to start.')
		})
		it('Can be finalized.', () => {

			let q = new FunctionQueue({
				value: 42,
			})

			expect(q.isFinalized()).toBe(false, 'Not finalized by default.')

			q.start()

			expect(q.isFinalized()).toBe(false, 'Not finalized by start.')

			q.onFinished(() => { })

			expect(q.isFinalized()).toBe(true, 'Finalized after onFinished.')
		})
	})
	describe('onValue', () => {
		it('Receives value and can change it.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					expect(v).toBe(42, 'Value should be received in onValue.')
					return 111
				})
				.start()

			expect(q.getValue()).toBe(111, 'The value from onValue should be received.')
		})
		it('Receives value and can leave it as is.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					expect(v).toBe(42, 'Value should be received in onValue.')
				})
				.start()

			expect(q.getValue()).toBe(42, 'The original value should be received.')
		})
		it('Does not change the value when throwing an error in onValue.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onError((e, v) => {
					expect(e).toBe('error', 'The error should be received.')
					expect(v).toBe(42, 'The value should be received.')
					return 111
				})
				.start()

			expect(q.getValue()).toBe(111, 'The value from onError should be received.')
		})
		it('May return null to unset value.', () => {

			let q = new FunctionQueue<{} | null>({
				value: {},
			})
				.onValue(v => {
					return null
				})
				.start()

			expect(q.getValue()).toBeNull()
		})
		it('May return undefined to leave value unchanged.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					return undefined
				})
				.start()

			expect(q.getValue()).toBe(42)
		})
		it('May set defer to postpone execution till after the current function.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					expect(v).toBe(42)
					done()
					return 111
				}, { defer: true })
				.start()

			expect(q.getValue()).toBe(42)
		})
		it('Stacks onValue calls.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					expect(v).toBe(42, 'The original value should be received.')
					return 111
				})
				.onValue(v => {
					expect(v).toBe(111, 'The value from 1st onValue should be received.')
					return 222
				})
				.onValue(v => {
					expect(v).toBe(222, 'The value from 2nd onValue should be received.')
					return 333
				})
				.start()

			expect(q.getValue()).toBe(333, 'The value from 3rd onValue should be received.')
		})
		it('Skips onValue when there’s an error.', () => {

			let onValue1 = jasmine.createSpy('onValue')
			let onValue2 = jasmine.createSpy('onValue')

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onValue(onValue1)
				.onValue(onValue2)
				.start()

			expect(q.getError()).toBe('error', 'The error should be received.')
			expect(q.getValue()).toBe(42, 'The original value should be received.')
			expect(onValue1).not.toHaveBeenCalled()
			expect(onValue2).not.toHaveBeenCalled()
		})
		it('Shows an error in console after an unhandled error.', (done) => {

			let consoleError = spyOn(console, 'error')

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.start()

			setTimeout(() => {
				expect(consoleError).toHaveBeenCalledTimes(1)
				done()
			}, 10)
		})
	})
	describe('onValueDoWithCallback', () => {
		it('May resolve immediately.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValueDoWithCallback((v, resolve) => {
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.start()

			expect(q.getError()).toBeUndefined('Should not receive an error.')
			expect(q.getValue()).toBe(111, 'Should receive the value from onValueDoWithCallback.')
		})
		it('May not reject after it resolved.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValueDoWithCallback((v, resolve, reject) => {
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
					reject('error')
				})
				.start()

			expect(q.getError()).toBeUndefined('Should not receive an error.')
			expect(q.getValue()).toBe(111, 'Should receive the value from onValueDoWithCallback.')
		})
		it('May not resolve after it’s been rejected.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValueDoWithCallback((v, resolve, reject) => {
					expect(v).toBe(42, 'Should receive the value.')
					reject('error')
					resolve(111)
				})
				.start()

			expect(q.getError()).toBe('error', 'Should receive the error.')
			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May reject with no error.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValueDoWithCallback((v, resolve, reject) => {
					expect(v).toBe(42, 'Should receive the value.')
					reject()
				})
				.start()

			expect(q.getError()).toEqual(new Error(), 'Should receive an error.')
			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May throw.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValueDoWithCallback((v, resolve, reject) => {
					throw 'error'
				})
				.start()

			expect(q.getError()).toEqual('error', 'Should receive error.')
			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
	})
	describe('afterValue', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.afterValue(v => {
					expect(v).toBe(42, 'Should receive the value.')
					return 111
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterValue.')
					done()
				})
				.start()

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May throw.', (done) => {

			let q = new FunctionQueue({
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
				.start()
		})
	})
	describe('afterValueDoWithCallback', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.afterValueDoWithCallback((v, resolve, reject) => {
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterValue.')
					done()
				})
				.start()

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May reject.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.afterValueDoWithCallback((v, resolve, reject) => {
					reject('error')
				})
				.onFinished((e, v) => {
					expect(e).toBe('error', 'Should receive the error from afterValueDoWithCallback.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
				.start()
		})
		it('May throw.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.afterValueDoWithCallback((v, resolve, reject) => {
					throw 'error'
				})
				.onFinished((e, v) => {
					expect(e).toBe('error', 'Should receive the error from afterValueDoWithCallback.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
				.start()
		})
	})
	describe('onError', () => {
		it('Will not be called if there’s no error.', () => {

			let onError = jasmine.createSpy('onError')

			let q = new FunctionQueue({
				value: 42,
			})
				.onError(onError)
				.start()

			expect(onError).not.toHaveBeenCalled()
		})
		it('Will be called if there’s an error.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onError((e, v) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					return 111
				})
				.start()

			expect(q.getValue()).toBe(111, 'Should receive the value from onError.')
		})
	})
	describe('onErrorDoWithCallback', () => {
		it('Will not be called if there’s no error.', () => {

			let onErrorDoWithCallback = jasmine.createSpy('onError')

			let q = new FunctionQueue({
				value: 42,
			})
				.onErrorDoWithCallback(onErrorDoWithCallback)
				.start()

			expect(onErrorDoWithCallback).not.toHaveBeenCalled()
		})
		it('Will be called if there’s an error.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onErrorDoWithCallback((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.start()

			expect(q.getValue()).toBe(111, 'Should receive the value from onError.')
		})
		it('May reject immediately.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error 1'
				})
				.onErrorDoWithCallback((e, v, resolve, reject) => {
					reject('error 2')
				})
				.onFinished((e, v) => {
					expect(e).toBe('error 2', 'Should receive the error from onErrorDoWithCallback.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
				.start()
		})
		it('May throw.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error 1'
				})
				.onErrorDoWithCallback((v, resolve, reject) => {
					throw 'error 2'
				})
				.onFinished((e, v) => {
					expect(e).toBe('error 2', 'Should receive the error from onErrorDoWithCallback.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
				.start()
		})
	})
	describe('afterError', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.afterError((e, v) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					return 111
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterValue.')
					done()
				})
				.start()

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May throw.', (done) => {

			let q = new FunctionQueue({
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
				.start()
		})
	})
	describe('afterErrorDoWithCallback', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(() => {
					throw 'error'
				})
				.afterErrorDoWithCallback((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterErrorDoWithCallback.')
					done()
				})
				.start()

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
		it('May throw.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error 1'
				})
				.afterErrorDoWithCallback((e, v, resolve, reject) => {
					throw 'error 2'
				})
				.onFinished((e, v) => {
					expect(e).toBe('error 2', 'Should receive the error from afterErrorDoWithCallback.')
					expect(v).toBe(42, 'Should receive the original value.')
					done()
				})
				.start()
		})
	})
	describe('onErrorOrValue', () => {
		it('Receives values.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onErrorOrValue((e, v) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					return 111
				})
				.start()

			expect(q.getValue()).toBe(111, 'The value from onErrorOrValue should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onErrorOrValue((e, v) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					return 111
				})
				.start()

			expect(q.getValue()).toBe(111, 'The value from onErrorOrValue should be received.')
		})
	})
	describe('onErrorOrValueDoWithCallback', () => {
		it('Receives values.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onErrorOrValueDoWithCallback((e, v, resolve, reject) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})
				.start()

			expect(q.getValue()).toBe(111, 'The value from onErrorOrValueDoWithCallback should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onErrorOrValueDoWithCallback((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})
				.start()

			expect(q.getValue()).toBe(111, 'The value from onErrorOrValueDoWithCallback should be received.')
		})
	})
	describe('afterErrorOrValue', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.afterErrorOrValue((e, v) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					return 111
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterErrorOrValue.')
					done()
				})
				.start()

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
	})
	describe('afterErrorOrValueDoWithCallback', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(() => {
					throw 'error'
				})
				.afterErrorOrValueDoWithCallback((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterErrorOrValueDoWithCallback .')
					done()
				})
				.start()

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
	})
	describe('onFinished', () => {
		it('Supports onFinished.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(v).toBe(42, 'Value should be received.')
					return 111
				})
				.start()

			expect(q.getValue()).toBe(111, 'The value from onFinished should be received.')
		})
		it('Supports not returning a value from onFinished.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(v).toBe(42, 'Value should be received.')
				})
				.start()

			expect(q.getValue()).toBe(42, 'The original value should be received.')
		})
		it('Can splice functions before onFinished.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(v).toBe(333, 'Value from 3rd onValue should be received.')
					return 444
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
				.onError((e, v) => {
					expect(e).toBe('error 2', 'The error from onErrorOrValue should be received.')
					expect(v).toBe(42, 'Value from 2nd onValue should be received.')
					return 333
				})
				.start()

			expect(q.getValue()).toBe(444, 'The value from onFinished should be received.')
		})
		it('onFinished stacks in reverse.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('No error should occur 3.')
					expect(v).toBe(222, 'Value from 2nd onFinished should be received.')
					return 333
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('No error should occur 2.')
					expect(v).toBe(111, 'Value from 1st onFinished should be received.')
					return 222
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('No error should occur 1.')
					expect(v).toBe(42, 'Value should be received.')
					return 111
				})
				.start()

			expect(q.getValue()).toBe(333, 'The value from 3rd onFinished should be received.')
		})
		it('onFinished supports atEnd.', () => {
			let q = new FunctionQueue({
				value: 42,
			})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('No error should occur 1.')
					expect(v).toBe(42, 'Value should be received.')
					return 111
				}, { atEnd: true })
				.onFinished((e, v) => {
					expect(e).toBeUndefined('No error should occur 2.')
					expect(v).toBe(111, 'Value from 1st onFinished should be received.')
					return 222
				}, { atEnd: true })
				.onFinished((e, v) => {
					expect(e).toBeUndefined('No error should occur 3.')
					expect(v).toBe(222, 'Value from 2nd onFinished should be received.')
					return 333
				}, { atEnd: true })
				.start()

			expect(q.getValue()).toBe(333, 'The value from 3rd onFinished should be received.')
		})
		it('Can’t prepend onFinished after finalized.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onFinished(() => { })
				.start()

			expect(() => q.onFinished(() => { })).toThrowError(/finalized/)
		})
		it('Can append onFinished after finalized.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onFinished(() => 111)
				.start()

			expect(() => q.onFinished(() => 222, { atEnd: true })).not.toThrow()
			expect(q.getValue()).toBe(222, 'The value from the appended onFinished should be received.')
		})
	})
	describe('onFinishedDoWithCallback', () => {
		it('Receives values.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onFinishedDoWithCallback((e, v, resolve, reject) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})
				.start()

			expect(q.getValue()).toBe(111, 'The value from onFinishedDoWithCallback should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(v => {
					throw 'error'
				})
				.onFinishedDoWithCallback((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(v).toBe(42, 'Value should be received.')
					resolve(111)
				})
				.start()

			expect(q.getValue()).toBe(111, 'The value from onFinishedDoWithCallback should be received.')
		})
	})
	describe('afterFinished', () => {
		it('Runs after current function.', (done) => {

			let afterFinished = jasmine.createSpy('afterFinished', (e: any, v: number) => {
				expect(e).toBeUndefined('No error should occur 1.')
				expect(v).toBe(42, 'Value should be received.')
				done()
				return 111
			}).and.callThrough()

			let q = new FunctionQueue({
				value: 42,
			})
				.afterFinished(afterFinished)
				.start()

			expect(q.getValue()).toBe(42, 'The original value should be received.')
			expect(afterFinished).not.toHaveBeenCalled()
		})
		it('Works if added after start.', (done) => {

			let afterFinished = jasmine.createSpy('afterFinished', (e: any, v: number) => {
				expect(e).toBeUndefined('No error should occur 1.')
				expect(v).toBe(42, 'Value should be received.')
				done()
				return 111
			}).and.callThrough()

			let q = new FunctionQueue({
				value: 42,
			})
				.start()
				.afterFinished(afterFinished)

			expect(q.getValue()).toBe(42, 'The original value should be received.')
			expect(afterFinished).not.toHaveBeenCalled()
		})
	})
	describe('afterFinishedDoWithCallback', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunctionQueue({
				value: 42,
			})
				.onValue(() => {
					throw 'error'
				})
				.afterFinishedDoWithCallback((e, v, resolve, reject) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(v).toBe(42, 'Should receive the value.')
					resolve(111)
				})
				.onFinished((e, v) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(v).toBe(111, 'Should receive the value from afterFinishedDoWithCallback.')
					done()
				}, { atEnd: true })
				.start()

			expect(q.getValue()).toBe(42, 'Should receive the original value.')
		})
	})
})