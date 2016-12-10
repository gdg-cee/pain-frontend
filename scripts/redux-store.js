(function () {

  const Actions = {}

  Actions.App = {
    SET_PAGE: 'SET_PAGE',
    UPDATE_AUTH_USER: 'UPDATE_AUTH_USER',
    UPDATE_AUTH_STATE: 'UPDATE_AUTH_STATE'
  }

  Actions.Data = {}

  /**
   * `app.page` object Reducer
   */
  const AppPageReducer = (currentState = null, action) => {
    switch (action.type) {
      case Actions.App.SET_PAGE: {
        return action.page
      }
      default:
        return currentState
    }
  }

  /**
   * `app.auth` object Reducer
   */
  const AuthReducer = (currentState = {
    user: null,
    state: 'initializing'
  }, action) => {
    switch (action.type) {
      case Actions.App.UPDATE_AUTH_USER: {
        return Object.assign({}, currentState, {
          user: action.user
        })
      }
      case Actions.App.UPDATE_AUTH_STATE: {
        return Object.assign({}, currentState, {
          state: action.state
        })
      }
      default: {
        return currentState
      }
    }
  }

  /**
   * `app` object Reducer
   */
  const AppReducer = Redux.combineReducers({
    page: AppPageReducer,
    auth: AuthReducer
  })

  /**
   * `data` object Reducer
   */
  const DataReducer = Redux.combineReducers({})

  /**
   * Global Reducer
   */
  const Reducer = Redux.combineReducers({
    app: AppReducer,
    data: DataReducer
  })

  const store = Redux.createStore(Reducer)
  store.subscribe(() => {
    console.log('store state changed: ', store.getState())
  })

  window.PAIN.Redux = window.PAIN.Redux || {
      Store: store,
      Actions: Actions,

      dispatchUpdateAuthState(state) {
        store.dispatch({
          type: Actions.App.UPDATE_AUTH_STATE,
          state: state
        })
      },

      dispatchUpdateAuthUser(user) {
        store.dispatch({
          type: Actions.App.UPDATE_AUTH_USER,
          user: user
        })
      },

      dispatchUpdatePage(page) {
        store.dispatch({
          type: Actions.App.SET_PAGE,
          page: page
        })
      }

    }

})()