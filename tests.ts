import { FunQ, IFunQGuts, TFunQResolve } from './index'

describe('FunQ', () => {
	describe('instance', () => {
		it('Can be passed a data.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})

			expect(q.getData()).toEqual({ n: 42 })
		})
		it('Can be started.', () => {

			let q = new FunQ({
				data: { n: 42 },
				dontStart: true,
			})

			expect(q.isStarted()).toBe(false, 'Not started by default.')

			q.start()

			expect(q.isStarted()).toBe(true, 'Started after a call to start.')
		})
		it('Can be finalized.', () => {

			let q = new FunQ({
				data: { n: 42 },
				dontDelayFinalize: true,
			})

			expect(q.isFinalized()).toBe(false, 'Not finalized by default.')

			q.onFinished(() => { })

			expect(q.isFinalized()).toBe(true, 'Finalized after onFinished.')
		})
	})
	describe('onSuccess', () => {
		it('Receives data and can change it.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.data).toEqual({ n: 42 }, 'Data should be received in onSuccess.')
					q.data.n = 111
				})

			expect(q.getData()).toEqual({ n: 111 }, 'The data from onSuccess should be received.')
		})
		it('Receives data and can leave it as is.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.data).toEqual({ n: 42 }, 'Data should be received in onSuccess.')
				})

			expect(q.getData()).toEqual({ n: 42 }, 'The original data should be received.')
		})
		it('Does not change the data when throwing an error in onSuccess.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onError((e, q) => {
					expect(e).toBe('error', 'The error should be received.')
					expect(q.data).toEqual({ n: 42 }, 'The data should be received.')
					q.data.n = 111
				})

			expect(q.getData()).toEqual({ n: 111 }, 'The data from onError should be received.')
		})
		it('May set defer to postpone execution till after the current function.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.data).toEqual({ n: 42 })
					q.data.n = 111
					done()
				}, { defer: true })

			expect(q.getData()).toEqual({ n: 42 })
		})
		it('Stacks onSuccess calls.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess((q) => {
					expect(q.data).toEqual({ n: 42 }, 'The original data should be received.')
					q.data.n = 111
				})
				.onSuccess((q) => {
					expect(q.data).toEqual({ n: 111 }, 'The data from 1st onSuccess should be received.')
					q.data.n = 222
				})
				.onSuccess((q) => {
					expect(q.data).toEqual({ n: 222 }, 'The data from 2nd onSuccess should be received.')
					q.data.n = 333
				})

			expect(q.getData()).toEqual({ n: 333 }, 'The data from 3rd onSuccess should be received.')
		})
		it('Skips onSuccess when there’s an error.', () => {

			let onSuccess = jasmine.createSpy('onSuccess')

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onSuccess(onSuccess)

			expect(q.getError()).toBe('error', 'The error should be received.')
			expect(q.getData()).toEqual({ n: 42 }, 'The original data should be received.')
			expect(onSuccess).not.toHaveBeenCalled()
		})
		it('Shows an error in console after an unhandled error.', (done) => {

			let consoleError = spyOn(console, 'error')

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})

			setTimeout(() => {
				expect(consoleError).toHaveBeenCalledTimes(1)
				done()
			}, 10)
		})
	})
	describe('onSuccessAwait', () => {
		it('May resolve immediately.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccessAwait((q) => {
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.data.n = 111
					q.resolve()
				})

			expect(q.getError()).toBeUndefined('Should not receive an error.')
			expect(q.getData()).toEqual({ n: 111 }, 'Should receive the data from onSuccessAwait.')
		})
		it('May not reject after it resolved.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccessAwait((q) => {
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.data.n = 111
					q.resolve()
					q.reject('error')
				})

			expect(q.getError()).toBeUndefined('Should not receive an error.')
			expect(q.getData()).toEqual({ n: 111 }, 'Should receive the data from onSuccessAwait.')
		})
		it('May not resolve after it’s been rejected.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccessAwait((q) => {
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.reject('error')
					q.resolve()
				})

			expect(q.getError()).toBe('error', 'Should receive the error.')
			expect(q.getData()).toEqual({ n: 42 }, 'Should receive the original data.')
		})
		it('May reject with no error.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccessAwait((q) => {
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.reject()
				})

			expect(q.getError()).toEqual(new Error(), 'Should receive an error.')
			expect(q.getData()).toEqual({ n: 42 }, 'Should receive the original data.')
		})
		it('May throw.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccessAwait((q) => {
					throw 'error'
				})

			expect(q.getError()).toEqual('error', 'Should receive error.')
			expect(q.getData()).toEqual({ n: 42 }, 'Should receive the original data.')
		})
	})
	describe('afterSuccess', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.afterSuccess((q) => {
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.data.n = 111
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.data).toEqual({ n: 111 }, 'Should receive the data from afterSuccess.')
					done()
				})

			expect(q.getData()).toEqual({ n: 42 }, 'Should receive the original data.')
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.afterSuccess(v => {
					throw 'error'
				})
				.onFinished((e, q) => {
					expect(e).toBe('error', 'Should receive the error from afterSuccess.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the original data.')
					done()
				})
		})
	})
	describe('afterSuccessAwait', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.afterSuccessAwait((q) => {
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.data.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.data).toEqual({ n: 111 }, 'Should receive the data from afterSuccessAwait.')
					done()
				})

			expect(q.getData()).toEqual({ n: 42 }, 'Should receive the original data.')
		})
		it('May reject.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.afterSuccessAwait((q) => {
					q.reject('error')
				})
				.onFinished((e, q) => {
					expect(e).toBe('error', 'Should receive the error from afterSuccessAwait.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the original data.')
					done()
				})
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.afterSuccessAwait((q) => {
					throw 'error'
				})
				.onFinished((e, q) => {
					expect(e).toBe('error', 'Should receive the error from afterSuccessAwait.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the original data.')
					done()
				})
		})
	})
	describe('onError', () => {
		it('Will not be called if there’s no error.', () => {

			let onError = jasmine.createSpy('onError')

			let q = new FunQ({
				data: { n: 42 },
			})
				.onError(onError)

			expect(onError).not.toHaveBeenCalled()
		})
		it('Will be called if there’s an error.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onError((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.data.n = 111
				})

			expect(q.getData()).toEqual({ n: 111 }, 'Should receive the data from onError.')
		})
	})
	describe('onErrorAwait', () => {
		it('Will not be called if there’s no error.', () => {

			let onErrorAwait = jasmine.createSpy('onErrorAwait')

			let q = new FunQ({
				data: { n: 42 },
			})
				.onErrorAwait(onErrorAwait)

			expect(onErrorAwait).not.toHaveBeenCalled()
		})
		it('Will be called if there’s an error.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onErrorAwait((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.data.n = 111
				})

			expect(q.getData()).toEqual({ n: 111 }, 'Should receive the data from onError.')
		})
		it('May reject immediately.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error 1'
				})
				.onErrorAwait((e, q) => {
					q.reject('error 2')
				})
				.onFinished((e, q) => {
					expect(e).toBe('error 2', 'Should receive the error from onErrorAwait.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the original data.')
					done()
				})
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error 1'
				})
				.onErrorAwait((q) => {
					throw 'error 2'
				})
				.onFinished((e, q) => {
					expect(e).toBe('error 2', 'Should receive the error from onErrorAwait.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the original data.')
					done()
				})
		})
	})
	describe('afterError', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.afterError((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.data.n = 111
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.data).toEqual({ n: 111 }, 'Should receive the data from afterSuccess.')
					done()
				})

			expect(q.getData()).toEqual({ n: 42 }, 'Should receive the original data.')
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error 1'
				})
				.afterError((e, q) => {
					throw 'error 2'
				})
				.onFinished((e, q) => {
					expect(e).toBe('error 2', 'Should receive the error from afterError.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the original data.')
					done()
				})
		})
	})
	describe('afterErrorAwait', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(() => {
					throw 'error'
				})
				.afterErrorAwait((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.data.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.data).toEqual({ n: 111 }, 'Should receive the data from afterErrorAwait.')
					done()
				})

			expect(q.getData()).toEqual({ n: 42 }, 'Should receive the original data.')
		})
		it('May throw.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error 1'
				})
				.afterErrorAwait((e, q) => {
					throw 'error 2'
				})
				.onFinished((e, q) => {
					expect(e).toBe('error 2', 'Should receive the error from afterErrorAwait.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the original data.')
					done()
				})
		})
	})
	describe('onDone', () => {
		it('Receives datas.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onDone((e, q) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
					q.data.n = 111
				})

			expect(q.getData()).toEqual({ n: 111 }, 'The data from onDone should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onDone((e, q) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
					q.data.n = 111
				})

			expect(q.getData()).toEqual({ n: 111 }, 'The data from onDone should be received.')
		})
	})
	describe('onDoneAwait', () => {
		it('Receives datas.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onDoneAwait((e, q) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
					q.data.n = 111
					q.resolve()
				})

			expect(q.getData()).toEqual({ n: 111 }, 'The data from onDoneAwait should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onDoneAwait((e, q) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
					q.data.n = 111
					q.resolve()
				})

			expect(q.getData()).toEqual({ n: 111 }, 'The data from onDoneAwait should be received.')
		})
	})
	describe('afterDone', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(v => {
					throw 'error'
				})
				.afterDone((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.data.n = 111
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.data).toEqual({ n: 111 }, 'Should receive the data from afterDone.')
					done()
				})

			expect(q.getData()).toEqual({ n: 42 }, 'Should receive the original data.')
		})
	})
	describe('afterDoneAwait', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onSuccess(() => {
					throw 'error'
				})
				.afterDoneAwait((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.data.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.data).toEqual({ n: 111 }, 'Should receive the data from afterDoneAwait .')
					done()
				})

			expect(q.getData()).toEqual({ n: 42 }, 'Should receive the original data.')
		})
	})
	describe('onFinished', () => {
		it('Supports onFinished.', () => {

			let q = new FunQ({
				data: { n: 42 },
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
					q.data.n = 111
				})

			expect(q.getData()).toEqual({ n: 111 }, 'The data from onFinished should be received.')
		})
		it('Supports not returning a data from onFinished.', () => {

			let q = new FunQ({
				data: { n: 42 },
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
				})

			expect(q.getData()).toEqual({ n: 42 }, 'The original data should be received.')
		})
		it('Can splice functions before onFinished.', () => {

			let q = new FunQ({
				data: { n: 42 },
				dontStart: true,
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur.')
					expect(q.data).toEqual({ n: 333 }, 'Data from 3rd onSuccess should be received.')
					q.data.n = 444
				})
				.onSuccess(q => {
					expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
					throw 'error 1'
				})
				.onDone((e, q) => {
					expect(e).toBe('error 1', 'The error from onSuccess should be received.')
					expect(q.data).toEqual({ n: 42 }, 'Data from 1st onSuccess should be received.')
					throw 'error 2'
				})
				.onError((e, q) => {
					expect(e).toBe('error 2', 'The error from onDone should be received.')
					expect(q.data).toEqual({ n: 42 }, 'Data from 2nd onSuccess should be received.')
					q.data.n = 333
				})
				.start()

			expect(q.getData()).toEqual({ n: 444 }, 'The data from onFinished should be received.')
		})
		it('onFinished stacks in reverse.', () => {

			let q = new FunQ({
				data: { n: 42 },
				dontStart: true,
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 3.')
					expect(q.data).toEqual({ n: 222 }, 'Data from 2nd onFinished should be received.')
					q.data.n = 333
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 2.')
					expect(q.data).toEqual({ n: 111 }, 'Data from 1st onFinished should be received.')
					q.data.n = 222
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 1.')
					expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
					q.data.n = 111
				})
				.start()

			expect(q.getData()).toEqual({ n: 333 }, 'The data from 3rd onFinished should be received.')
		})
		it('onFinished supports atEnd.', () => {
			let q = new FunQ({
				data: { n: 42 },
				dontStart: true,
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 1.')
					expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
					q.data.n = 111
				}, { atEnd: true })
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 2.')
					expect(q.data).toEqual({ n: 111 }, 'Data from 1st onFinished should be received.')
					q.data.n = 222
				}, { atEnd: true })
				.onFinished((e, q) => {
					expect(e).toBeUndefined('No error should occur 3.')
					expect(q.data).toEqual({ n: 222 }, 'Data from 2nd onFinished should be received.')
					q.data.n = 333
				}, { atEnd: true })
				.start()

			expect(q.getData()).toEqual({ n: 333 }, 'The data from 3rd onFinished should be received.')
		})
		it('Can’t prepend onFinished after finalized.', () => {

			let q = new FunQ({
				data: { n: 42 },
				dontDelayFinalize: true,
			})
				.onFinished(() => { })

			expect(() => q.onFinished(() => { })).toThrowError(/finalized/)
		})
		it('Can append onFinished after finalized.', () => {

			let q = new FunQ({
				data: { n: 42 },
				dontDelayFinalize: true,
			})
				.onFinished((e, q) => {
					q.data.n = 111
				})

			expect(() => q.onFinished((e, q) => q.data.n = 222, { atEnd: true })).not.toThrow()
			expect(q.getData()).toEqual({ n: 222 }, 'The data from the appended onFinished should be received.')
		})
		it('Can delay finalizing.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
			})
				.onFinished((e, q) => {
					expect(q.data).toEqual({ n: 222 }, 'The data from onSuccess should be received.')
					q.data.n = 333
				})
				.onSuccess((q) => {
					expect(q.data).toEqual({ n: 42 }, 'The original data should be received.')
					q.data.n = 111
				})
				.onFinished((e, q) => {
					expect(q.data).toEqual({ n: 111 }, 'The data from onSuccess should be received.')
					q.data.n = 222
				})
				.onFinished((e, q) => {
					expect(q.data).toEqual({ n: 333 }, 'The data from the first onFinished should be received.')
					done()
				}, { atEnd: true })
		})
	})
	describe('onFinishedAwait', () => {
		it('Receives datas.', () => {

			let q = new FunQ({
				data: { n: 42 },
				dontDelayFinalize: true,
			})
				.onFinishedAwait((e, q) => {
					expect(e).toBeUndefined('No error should be received.')
					expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
					q.data.n = 111
					q.resolve()
				})

			expect(q.getData()).toEqual({ n: 111 }, 'The data from onFinishedAwait should be received.')
		})
		it('Catches errors.', () => {

			let q = new FunQ({
				data: { n: 42 },
				dontDelayFinalize: true,
			})
				.onSuccess(v => {
					throw 'error'
				})
				.onFinishedAwait((e, q) => {
					expect(e).toBe('error', 'Error should be received.')
					expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
					q.data.n = 111
				})

			expect(q.getData()).toEqual({ n: 111 }, 'The data from onFinishedAwait should be received.')
		})
	})
	describe('afterFinished', () => {
		it('Runs after current function.', (done) => {

			let afterFinished = jasmine.createSpy('afterFinished', (e: any, q: IFunQGuts<{n: number}>) => {
				expect(e).toBeUndefined('No error should occur 1.')
				expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
				done()
				q.data.n = 111
			}).and.callThrough()

			let q = new FunQ({
				data: { n: 42 },
				dontDelayFinalize: true,
			})
				.afterFinished(afterFinished)

			expect(q.getData()).toEqual({ n: 42 }, 'The original data should be received.')
			expect(afterFinished).not.toHaveBeenCalled()
		})
		it('Works if added after start.', (done) => {

			let afterFinished = jasmine.createSpy('afterFinished', (e: any, q: IFunQGuts<{n: number}>) => {
				expect(e).toBeUndefined('No error should occur 1.')
				expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
				done()
				q.data.n = 111
			}).and.callThrough()

			let q = new FunQ({
				data: { n: 42 },
				dontStart: true,
				dontDelayFinalize: true,
			})
				.start()
				.afterFinished(afterFinished)

			expect(q.getData()).toEqual({ n: 42 }, 'The original data should be received.')
			expect(afterFinished).not.toHaveBeenCalled()
		})
	})
	describe('afterFinishedAwait', () => {
		it('Executes after the current function.', (done) => {

			let q = new FunQ({
				data: { n: 42 },
				dontDelayFinalize: true,
			})
				.onSuccess(() => {
					throw 'error'
				})
				.afterFinishedAwait((e, q) => {
					expect(e).toBe('error', 'Should receive the error.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					q.data.n = 111
					q.resolve()
				})
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.data).toEqual({ n: 111 }, 'Should receive the data from afterFinishedAwait.')
					done()
				}, { atEnd: true })

			expect(q.getData()).toEqual({ n: 42 }, 'Should receive the original data.')
		})
	})
	describe('onSuccessAwaitAll', () => {
		it('Works with an empty array.', (done) => {
			new FunQ({ data: { n: 42 } })
				.onSuccessAwaitAll([])
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.data).toEqual({ n: 42 }, 'Should receive the data.')
					done()
				})
		})
		it('Calls all functions.', (done) => {
			new FunQ({ data: { a: false, b: false, c: false } })
				.onSuccessAwaitAll([
					(q) => {
						q.data.a = true
						q.resolve()
					},
					(q) => {
						q.data.b = true
						q.resolve()
					},
					(q) => {
						q.data.c = true
						q.resolve()
					},
				])
				.onFinished((e, q) => {
					expect(e).toBeUndefined('Should not receive an error.')
					expect(q.data).toEqual({ a: true, b: true, c: true }, 'Should receive the data.')
					done()
				})
		})
		it('Collects all thrown errors.', (done) => {
			new FunQ()
				.onSuccessAwaitAll([
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
				.onSuccessAwaitAll([
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
			new FunQ({ data: { a: false, b: false } })
				.onSuccessAwaitAll([
					(q) => {
						q.reject('error')
					},
					(q) => {
						q.data.b = true
						q.resolve()
					},
				])
				.onError((e, q) => {
					expect(e).toEqual(['error'])
					expect(q.data).toEqual({ a: false, b: true })
					done()
				})
		})
	})
	describe('afterSuccessAwaitAll', () => {
		it('Runs after current function.', (done) => {

			let afterSuccessAwaitAll = jasmine.createSpy('afterSuccessAwaitAll', (q: IFunQGuts<{n: number}>) => {
				expect(q.data).toEqual({ n: 42 }, 'Data should be received.')
				q.data.n = 111
				q.resolve()
				done()
			}).and.callThrough()

			let q = new FunQ({
				data: { n: 42 },
				dontDelayFinalize: true,
			})
				.afterSuccessAwaitAll([afterSuccessAwaitAll])

			expect(q.getData()).toEqual({ n: 42 }, 'The original data should be received.')
			expect(afterSuccessAwaitAll).not.toHaveBeenCalled()
		})
	})
})