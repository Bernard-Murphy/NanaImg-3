import { createClient } from 'graphql-sse'
import { print } from 'graphql'
import { ApolloLink, Observable, FetchResult } from '@apollo/client'

export class SSELink extends ApolloLink {
  constructor(options: any) {
    super()
    this.client = createClient(options)
  }

  private client: any

  request(operation: any): Observable<FetchResult> {
    return new Observable((observer) => {
      const unsubscribe = this.client.subscribe(
        {
          query: print(operation.query),
          variables: operation.variables,
          operationName: operation.operationName,
        },
        {
          next: (result: any) => {
            observer.next(result as FetchResult)
          },
          error: (error: any) => {
            observer.error(error)
          },
          complete: () => {
            observer.complete()
          },
        }
      )

      return unsubscribe
    })
  }
}
