import SharedProperties from './sharedProperties.js'
import { isObject } from './utils.js'

export default class Events {
  queue: Record<string, any> = []
  sendInterval: ReturnType<typeof setInterval> | null = null
  ownProperties: Record<string, any> = {}

  constructor(
    private readonly sharedProperties: SharedProperties,
    private readonly getToken: () => string,
    private readonly getTimestamp: () => number,
    private readonly batchInterval = 5000,
  ) {
    this.sendInterval = setInterval(() => {
      void this.sendBatch()
    }, batchInterval)
  }

  /**
   * Add event to batch with option to send it immediately,
   * properties are optional and will not be saved as super prop
   * */
  sendEvent = (
    eventName: string,
    properties?: Record<string, any>,
    options?: { send_immediately: boolean },
  ) => {
    // add properties
    const eventProps = {}
    if (properties) {
      if (!isObject(properties)) {
        throw new Error('Properties must be an object')
      }
      Object.entries(properties).forEach(([key, value]) => {
        if (!this.sharedProperties.defaultPropertyKeys.includes(key)) {
          eventProps[key] = value
        }
      })
    }
    const event = {
      event: eventName,
      properties: { ...this.sharedProperties.all, ...this.ownProperties, ...eventProps },
      timestamp: this.getTimestamp(),
    }
    if (options?.send_immediately) {
      void this.sendSingle(event)
    } else {
      this.queue.push(event)
    }
  }

  sendBatch = async () => {
    if (this.queue.length === 0) {
      return
    }
    const headers = {
      Authorization: `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json',
    }
    // await fetch blah blah + token
  }

  sendSingle = async (event) => {
    const headers = {
      Authorization: `Bearer ${this.getToken()}`,
      'Content-Type': 'application/json',
    }
    // await fetch blah blah + token
  }

  /**
   * creates super property for all events
   * TODO: export as tracker.register
   * */
  setProperty = (nameOrProperties: Record<string, any> | string, value?: any) => {
    if (isObject(nameOrProperties)) {
      Object.entries(nameOrProperties).forEach(([key, val]) => {
        if (!this.sharedProperties.defaultPropertyKeys.includes(key)) {
          this.ownProperties[key] = val
        }
      })
    }
    if (typeof nameOrProperties === 'string' && value !== undefined) {
      if (!this.sharedProperties.defaultPropertyKeys.includes(nameOrProperties)) {
        this.ownProperties[nameOrProperties] = value
      }
    }
  }

  /**
   * set super property only if it doesn't exist
   * TODO: export as register_once
   * */
  setPropertiesOnce = (nameOrProperties: Record<string, any> | string, value?: any) => {
    if (isObject(nameOrProperties)) {
      Object.entries(nameOrProperties).forEach(([key, val]) => {
        if (!this.ownProperties[key] && !reservedProps.includes(key)) {
          this.ownProperties[key] = val
        }
      })
    }
    if (typeof nameOrProperties === 'string' && value !== undefined) {
      if (!this.ownProperties[nameOrProperties] && !reservedProps.includes(nameOrProperties)) {
        this.ownProperties[nameOrProperties] = value
      }
    }
  }

  /**
   * removes properties from list
   * TODO: export as unregister
   * */
  unsetProperties = (properties: string | string[]) => {
    if (Array.isArray(properties)) {
      properties.forEach((key) => {
        if (this.ownProperties[key] && !reservedProps.includes(key)) {
          delete this.ownProperties[key]
        }
      })
    } else if (this.ownProperties[properties] && !reservedProps.includes(properties)) {
      delete this.ownProperties[properties]
    }
  }

  generateDynamicProperties = () => {
    return {
      $auto_captured: false,
      $current_url: window.location.href,
      $referrer: document.referrer,
    }
  }
}
