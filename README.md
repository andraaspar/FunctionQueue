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
        new FunQ({value: {db: null}})
            .onValueDoWithCallback((value, resolve, reject) => {
                openDb(/* ... */,
                    result => {
                        value.db = result
                        resolve()
                    },
                    error => reject(error))
            })
            .onFinished((error, value) => {
                console.error(error)
                closeDb(value.db)
            })
            .start()
    )
}

loadMyData()
    .onValueDoWithCallback((value, resolve, reject) => {
        value.db.select(/* ... */,
            result => {
                value.result = result
                resolve()
            },
            error => reject(error))
    })
    .onValue((value) => {
        // Do something with value.result
    })
```

### Why would I want to run a Promise synchronously?

Because you want something to finish immediately? Like your unit tests?

With FunQ, you have a choice of running callbacks in sync or async, depending on what you need. It comes with the following method pairs:

* onValue / afterValue
* onError / afterError
* onFinished / afterFinished

Each after... method runs after the current function returns; each on... method runs immediately (once it's their turn).

Also, rather than returning a value, you may opt to use resolve / reject callbacks once the value is ready. These resolve / reject callbacks can also be called synchronously, or asynchronously. To use them, you need to use a different method:

* onValue -> onValueDoWithCallback
* onError -> onErrorDoWithCallback
* onFinished -> onFinishedDoWithCallback

The after... methods also work:

* afterValue -> afterValueDoWithCallback
* afterError -> afterErrorDoWithCallback
* afterFinished -> afterFinishedDoWithCallback

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

```JS
import { FunQ } from 'fun-q'

new FunQ({value: 42})
    .onValue((value) => 24)
    .onError((e, value) => NaN)
    .onFinished((e, value) => {
        console.log(value)
    })
    .start()
```

Check the [unit tests](https://github.com/andraaspar/fun-q/blob/master/tests.ts) for more examples.

## License

MIT