import { FunQ, IFunQGuts, TFunQResolve } from './index'

describe('FunQ', () => {
	describe('instance', () => {
		it('Can be passed a value.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})

			expect(q.getValue()).toEqual({ n: 42 })
		})
		it('Can be started.', () => {

			let q = new FunQ({
				value: { n: 42 },
				dontStart: true,
			})

			expect(q.isStarted()).toBe(false, 'Not started by default.')

			q.start()

			expect(q.isStarted()).toBe(true, 'Started after a call to start.')
		})
		it('Can be finalized.', () => {

			let q = new FunQ({
				value: { n: 42 },
				dontDelayFinalize: true,
			})

			expect(q.isFinalized()).toBe(false, 'Not finalized by default.')

			q.onFinished(() => { })

			expect(q.isFinalized()).toBe(true, 'Finalized after onFinished.')
		})
	})
	describe('onSuccess', () => {
		it('Receives value and can change it.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.value).toEqual({ n: 42 }, 'Value should be received in onSuccess.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 111 }, 'The value from onSuccess should be received.')
		})
		it('Receives value and can leave it as is.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.value).toEqual({ n: 42 }, 'Value should be received in onSuccess.')
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 42 }, 'The original value should be received.')
		})
		it('Does not change the value when throwing an error in onSuccess.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onError((e, q) => {
					expect(e).toBe('error', 'The error should be received.')
					expect(q.value).toEqual({ n: 42 }, 'The value should be received.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 111 }, 'The value from onError should be received.')
		})
		it('May set defer to postpone execution till after the current function.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.value).toEqual({ n: 42 })
					q.value.n = 111
					q.resolve()
					done()
				}, { defer: true })

			expect(q.getValue()).toEqual({ n: 42 })
		})
		it('Stacks onSuccess calls.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.value).toEqual({ n: 42 }, 'The original value should be received.')
					q.value.n = 111
					q.resolve()
				})
				.onSuccess((q) => {
					expect(q.value).toEqual({ n: 111 }, 'The value from 1st onSuccess should be received.')
					q.value.n = 222
					q.resolve()
				})
				.onSuccess((q) => {
					expect(q.value).toEqual({ n: 222 }, 'The value from 2nd onSuccess should be received.')
					q.value.n = 333
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 333 }, 'The value from 3rd onSuccess should be received.')
		})
		it('Skips onSuccess when there’s an error.', () => {

			let onSuccess = jasmine.createSpy('onSuccess')

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onSuccess(onSuccess)

			expect(q.getError()).toBe('error', 'The error should be received.')
			expect(q.getValue()).toEqual({ n: 42 }, 'The original value should be received.')
			expect(onSuccess).not.toHaveBeenCalled()
		})
		it('Shows an error in console after an unhandled error.', (done) => {

			let consoleError = spyOn(console, 'error')

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})

			setTimeout(() => {
				expect(consoleError).toHaveBeenCalledTimes(1)
				done()
			}, 10)
		})
		it('May resolve immediately.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getError()).toBeUndefined('Should not receive an error.')
			expect(q.getValue()).toEqual({ n: 111 }, 'Should receive the value from onSuccess.')
		})
		it('May not reject after it resolved.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.value.n = 111
					q.resolve()
					q.reject('error')
				})

			expect(q.getError()).toBeUndefined('Should not receive an error.')
			expect(q.getValue()).toEqual({ n: 111 }, 'Should receive the value from onSuccess.')
		})
		it('May not resolve after it’s been rejected.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.reject('error')
					q.resolve()
				})

			expect(q.getError()).toBe('error', 'Should receive the error.')
			expect(q.getValue()).toEqual({ n: 42 }, 'Should receive the original value.')
		})
		it('May reject with no error.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.reject()
				})

			expect(q.getError()).toEqual(new Error(), 'Should receive an error.')
			expect(q.getValue()).toEqual({ n: 42 }, 'Should receive the original value.')
		})
		it('May throw.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess((q) => {
					throw 'error'
				})

			expect(q.getError()).toEqual('error', 'Should receive error.')
			expect(q.getValue()).toEqual({ n: 42 }, 'Should receive the original value.')
		})
	})
	describe('afterSuccess', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.afterSuccess((q) => {
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.value.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.value).toEqual({ n: 111 }, 'Should receive the value from afterSuccess.')
					done()
				})

			expect(q.getValue()).toEqual({ n: 42 }, 'Should receive the original value.')
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.afterSuccess(v => {
					throw 'error'
				})
				.onFinished((e, q) => {
					expect(e).toBe('error', 'Should receive the error from afterSuccess.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the original value.')
					done()
				})
		})
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.afterSuccess((q) => {
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.value.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.value).toEqual({ n: 111 }, 'Should receive the value from afterSuccess.')
					done()
				})

			expect(q.getValue()).toEqual({ n: 42 }, 'Should receive the original value.')
		})
		it('May reject.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.afterSuccess((q) => {
					q.reject('error')
				})
				.onFinished((e, q) => {
					expect(e).toBe('error', 'Should receive the error from afterSuccess.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the original value.')
					done()
				})
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.afterSuccess((q) => {
					throw 'error'
				})
				.onFinished((e, q) => {
					expect(e).toBe('error', 'Should receive the error from afterSuccess.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the original value.')
					done()
				})
		})
	})
	describe('onError', () => {
		it('Will not be called if there’s no error.', () => {

			let onError = jasmine.createSpy('onError')

			let q = new FunQ({
				value: { n: 42 },
			})
				.onError(onError)

			expect(onError).not.toHaveBeenCalled()
		})
		it('Will be called if there’s an error.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onError((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 111 }, 'Should receive the value from onError.')
		})
		it('Will not be called if there’s no error.', () => {

			let onError = jasmine.createSpy('onError')

			let q = new FunQ({
				value: { n: 42 },
			})
				.onError(onError)

			expect(onError).not.toHaveBeenCalled()
		})
		it('Will be called if there’s an error.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onError((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 111 }, 'Should receive the value from onError.')
		})
		it('May reject immediately.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error 1'
				})
				.onError((e, q) => {
					q.reject('error 2')
				})
				.onFinished((e, q) => {
					expect(e).toBe('error 2', 'Should receive the error from onError.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the original value.')
					done()
				})
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error 1'
				})
				.onError((q) => {
					throw 'error 2'
				})
				.onFinished((e, q) => {
					expect(e).toBe('error 2', 'Should receive the error from onError.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the original value.')
					done()
				})
		})
	})
	describe('afterError', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.afterError((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.value.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.value).toEqual({ n: 111 }, 'Should receive the value from afterSuccess.')
					done()
				})

			expect(q.getValue()).toEqual({ n: 42 }, 'Should receive the original value.')
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error 1'
				})
				.afterError((e, q) => {
					throw 'error 2'
				})
				.onFinished((e, q) => {
					expect(e).toBe('error 2', 'Should receive the error from afterError.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the original value.')
					done()
				})
		})
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(() => {
					throw 'error'
				})
				.afterError((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.value.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.value).toEqual({ n: 111 }, 'Should receive the value from afterError.')
					done()
				})

			expect(q.getValue()).toEqual({ n: 42 }, 'Should receive the original value.')
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error 1'
				})
				.afterError((e, q) => {
					throw 'error 2'
				})
				.onFinished((e, q) => {
					expect(e).toBe('error 2', 'Should receive the error from afterError.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the original value.')
					done()
				})
		})
	})
	describe('onDone', () => {
		it('Receives values.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onDone((e, q) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 111 }, 'The value from onDone should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onDone((e, q) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 111 }, 'The value from onDone should be received.')
		})
		it('Receives values.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onDone((e, q) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 111 }, 'The value from onDone should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onDone((e, q) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 111 }, 'The value from onDone should be received.')
		})
	})
	describe('afterDone', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.afterDone((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.value.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.value).toEqual({ n: 111 }, 'Should receive the value from afterDone.')
					done()
				})

			expect(q.getValue()).toEqual({ n: 42 }, 'Should receive the original value.')
		})
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onSuccess(() => {
					throw 'error'
				})
				.afterDone((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.value.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.value).toEqual({ n: 111 }, 'Should receive the value from afterDone .')
					done()
				})

			expect(q.getValue()).toEqual({ n: 42 }, 'Should receive the original value.')
		})
	})
	describe('onFinished', () => {
		it('Supports onFinished.', () => {

			let q = new FunQ({
				value: { n: 42 },
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 111 }, 'The value from onFinished should be received.')
		})
		it('Supports not returning a value from onFinished.', () => {

			let q = new FunQ({
				value: { n: 42 },
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
				})

			expect(q.getValue()).toEqual({ n: 42 }, 'The original value should be received.')
		})
		it('Can splice functions before onFinished.', () => {

			let q = new FunQ({
				value: { n: 42 },
				dontStart: true,
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(q.value).toEqual({ n: 333 }, 'Value from 3rd onSuccess should be received.')
					q.value.n = 444
					q.resolve()
				})
				.onSuccess(q => {
					expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
					throw 'error 1'
				})
				.onDone((e, q) => {
					expect(e).toBe('error 1', 'The error from onSuccess should be received.')
					expect(q.value).toEqual({ n: 42 }, 'Value from 1st onSuccess should be received.')
					throw 'error 2'
				})
				.onError((e, q) => {
					expect(e).toBe('error 2', 'The error from onDone should be received.')
					expect(q.value).toEqual({ n: 42 }, 'Value from 2nd onSuccess should be received.')
					q.value.n = 333
					q.resolve()
				})
				.start()

			expect(q.getValue()).toEqual({ n: 444 }, 'The value from onFinished should be received.')
		})
		it('onFinished stacks in reverse.', () => {

			let q = new FunQ({
				value: { n: 42 },
				dontStart: true,
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 3.')
					expect(q.value).toEqual({ n: 222 }, 'Value from 2nd onFinished should be received.')
					q.value.n = 333
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 2.')
					expect(q.value).toEqual({ n: 111 }, 'Value from 1st onFinished should be received.')
					q.value.n = 222
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 1.')
					expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
					q.value.n = 111
					q.resolve()
				})
				.start()

			expect(q.getValue()).toEqual({ n: 333 }, 'The value from 3rd onFinished should be received.')
		})
		it('onFinished supports atEnd.', () => {
			let q = new FunQ({
				value: { n: 42 },
				dontStart: true,
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 1.')
					expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
					q.value.n = 111
					q.resolve()
				}, { atEnd: true })
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 2.')
					expect(q.value).toEqual({ n: 111 }, 'Value from 1st onFinished should be received.')
					q.value.n = 222
					q.resolve()
				}, { atEnd: true })
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 3.')
					expect(q.value).toEqual({ n: 222 }, 'Value from 2nd onFinished should be received.')
					q.value.n = 333
					q.resolve()
				}, { atEnd: true })
				.start()

			expect(q.getValue()).toEqual({ n: 333 }, 'The value from 3rd onFinished should be received.')
		})
		it('Can’t prepend onFinished after finalized.', () => {

			let q = new FunQ({
				value: { n: 42 },
				dontDelayFinalize: true,
			})
				.onFinished(() => { })

			expect(() => q.onFinished(() => { })).toThrowError(/finalized/)
		})
		it('Can append onFinished after finalized.', () => {

			let q = new FunQ({
				value: { n: 42 },
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					q.value.n = 111
					q.resolve()
				})

			expect(() => q.onFinished((e, q) => {
				q.value.n = 222
				q.resolve()
			}, { atEnd: true })).not.toThrow()
			expect(q.getValue()).toEqual({ n: 222 }, 'The value from the appended onFinished should be received.')
		})
		it('Can delay finalizing.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
			})
				.onFinished((e, q) => {
					expect(q.value).toEqual({ n: 222 }, 'The value from onSuccess should be received.')
					q.value.n = 333
					q.resolve()
				})
				.onSuccess((q) => {
					expect(q.value).toEqual({ n: 42 }, 'The original value should be received.')
					q.value.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(q.value).toEqual({ n: 111 }, 'The value from onSuccess should be received.')
					q.value.n = 222
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(q.value).toEqual({ n: 333 }, 'The value from the first onFinished should be received.')
					done()
				}, { atEnd: true })
		})
		it('Receives values.', () => {

			let q = new FunQ({
				value: { n: 42 },
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 111 }, 'The value from onFinished should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunQ({
				value: { n: 42 },
				dontDelayFinalize: true,
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onFinished((e, q) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
					q.value.n = 111
					q.resolve()
				})

			expect(q.getValue()).toEqual({ n: 111 }, 'The value from onFinished should be received.')
		})
	})
	describe('afterFinished', () => {
		it('Runs after current function.', (done) => {

			let afterFinished = jasmine.createSpy('afterFinished', (e: any, q: IFunQGuts<{n: number}>) => {
				expect(e).toBeUndefined('No error should occur 1.')
				expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
				done()
				q.value.n = 111
				q.resolve()
			}).and.callThrough()

			let q = new FunQ({
				value: { n: 42 },
				dontDelayFinalize: true,
			})
				.afterFinished(afterFinished)

			expect(q.getValue()).toEqual({ n: 42 }, 'The original value should be received.')
			expect(afterFinished).not.toHaveBeenCalled()
		})
		it('Works if added after start.', (done) => {

			let afterFinished = jasmine.createSpy('afterFinished', (e: any, q: IFunQGuts<{n: number}>) => {
				expect(e).toBeUndefined('No error should occur 1.')
				expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
				done()
				q.value.n = 111
				q.resolve()
			}).and.callThrough()

			let q = new FunQ({
				value: { n: 42 },
				dontStart: true,
				dontDelayFinalize: true,
			})
				.start()
				.afterFinished(afterFinished)

			expect(q.getValue()).toEqual({ n: 42 }, 'The original value should be received.')
			expect(afterFinished).not.toHaveBeenCalled()
		})
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				value: { n: 42 },
				dontDelayFinalize: true,
			})
				.onSuccess(() => {
					throw 'error'
				})
				.afterFinished((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					q.value.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.value).toEqual({ n: 111 }, 'Should receive the value from afterFinished.')
					done()
				}, { atEnd: true })

			expect(q.getValue()).toEqual({ n: 42 }, 'Should receive the original value.')
		})
	})
	describe('onSuccessResolveAll', () => {
		it('Works with an empty array.', (done) => {
			new FunQ({ value: { n: 42 } })
				.onSuccessResolveAll([])
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.value).toEqual({ n: 42 }, 'Should receive the value.')
					done()
				})
		})
		it('Calls all functions.', (done) => {
			new FunQ({ value: { a: false, b: false, c: false } })
				.onSuccessResolveAll([
					(q) => {
						q.value.a = true
						q.resolve()
					},
					(q) => {
						q.value.b = true
						q.resolve()
					},
					(q) => {
						q.value.c = true
						q.resolve()
					},
				])
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.value).toEqual({ a: true, b: true, c: true }, 'Should receive the value.')
					done()
				})
		})
		it('Collects all thrown errors.', (done) => {
			new FunQ()
				.onSuccessResolveAll([
					() => {
						throw 'a'
					},
					() => {
						throw 'b'
					},
					() => {
						throw 'c'
					},
				])
				.onFinished((e, q) => {
					expect(e).toContain('a')
					expect(e).toContain('b')
					expect(e).toContain('c')
					done()
				})
		})
		it('Collects all rejected errors.', (done) => {
			new FunQ()
				.onSuccessResolveAll([
					(q) => {
						q.reject('a')
					},
					(q) => {
						q.reject('b')
					},
					(q) => {
						q.reject('c')
					},
				])
				.onFinished((e, q) => {
					expect(e).toContain('a')
					expect(e).toContain('b')
					expect(e).toContain('c')
					done()
				})
		})
		it('Rejects when an error was thrown in any function.', (done) => {
			new FunQ({ value: { a: false, b: false } })
				.onSuccessResolveAll([
					(q) => {
						q.reject('error')
					},
					(q) => {
						q.value.b = true
						q.resolve()
					},
				])
				.onError((e, q) => {
					expect(e).toEqual(['error'])
					expect(q.value).toEqual({ a: false, b: true })
					done()
				})
		})
	})
	describe('afterSuccessResolveAll', () => {
		it('Runs after current function.', (done) => {

			let afterSuccessResolve = jasmine.createSpy('afterSuccessResolve', (q: IFunQGuts<{n: number}>) => {
				expect(q.value).toEqual({ n: 42 }, 'Value should be received.')
				q.value.n = 111
				q.resolve()
				done()
			}).and.callThrough()

			let q = new FunQ({
				value: { n: 42 },
				dontDelayFinalize: true,
			})
				.afterSuccessResolveAll([afterSuccessResolve])

			expect(q.getValue()).toEqual({ n: 42 }, 'The original value should be received.')
			expect(afterSuccessResolve).not.toHaveBeenCalled()
		})
	})
})