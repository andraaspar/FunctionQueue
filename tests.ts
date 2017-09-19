import { FunctionQueue } from './index'

describe('FunctionQueue', () => {
	describe('instance', () => {
		it('Can be passed a value.', () => {

			let q = new FunctionQueue({
				value: 42,
			})

			expect(q.getValue()).toBe(42)
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
		it('afterFinished runs after current function.', (done) => {

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
		it('afterFinished works if added after start.', (done) => {

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
})