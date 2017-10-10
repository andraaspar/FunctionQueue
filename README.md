# FunQ

> An alternative to Promises.

## Why use a FunQ instead of a Promise?

1. You can **finalize** a FunQ, but not a Promise.
2. FunQ can **optionally** execute a FunQ in **sync**, but not a Promise.

### Why would I want to finalize a Promise?

To redraw the UI once it finishes, or to close a DB connection after consumers are done with it.

Of course, you can’t finalize a Promise, but you can finalize a FunQ:

```JS
function openDb() {
    return (
        new FunQ({ value: { db: null } })
            .onSuccess((value, resolve, reject) => {
                openDb(/* ... */,
                    result => {
                        value.db = result
                        resolve()
                    },
                    error => reject(error))
            })
            .onFinished((error, value) => {
                if (error) console.error(error)
                closeDb(value.db)
            })
    )
}

loadMyData()
    .onSuccess((value, resolve, reject) => {
        value.db.select(/* ... */,
            result => {
                value.result = result
                resolve()
            },
            error => reject(error))
    })
    .onSuccess((value) => {
        // Do something with value.result
    })
```

### Why would I want to run a Promise synchronously?

Because you want something to finish immediately? Like your unit tests?

With FunQ, you have a choice of running callbacks now (in sync) or deferred (async, just like Promises), depending on what you need. It comes with the following method pairs:

* onSuccess / afterSuccess
* onError / afterError
* onFinished / afterFinished

Each after... method runs after the current function returns; each on... method runs immediately (once it's their turn).

You have full control, and no surprises.

## Install

```
npm i fun-q
```
or
```
yarn add fun-q
```

## Use

### Simple use

```JS
import { FunQ } from 'fun-q'

new FunQ({ value: { answer: 42 } })
    .onSuccess((value, resolve, reject) => {
        value.answer = 11
        resolve()
    })
    .onError((e, value, resolve, reject) => {
        value.answer = 22
        resolve()
    })
    .onFinished((e, value, resolve, reject) => {
        console.log(value.answer) // 11
    })
```

### Parallel execution

```JS
import { FunQ } from 'fun-q'

new FunQ({ value: { a: false, b: false } })
    .onSuccessResolveAll([
        (v, resolve) => {
            v.a = true
            resolve()
        },
        (v, resolve) => {
            v.b = true
            resolve()
        },
    ])
    .onFinished((e, v) => {
        console.log(v) // { a: true, b: true }
    })
```

Check the [unit tests](https://github.com/andraaspar/fun-q/blob/master/tests.ts) for more examples.

## License

MIT