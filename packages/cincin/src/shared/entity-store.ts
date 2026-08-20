import { Subscribable } from './subscribable';

type EntityStoreOptions<Key, Entity> = {
  selectId: (entity: Entity) => Key;
};

type EntityStorePredicate<Entity> = (entity: Entity) => boolean;

class EntityStore<Key, Entity, Event> extends Subscribable<
  (event: Event) => void
> {
  #entities = new Map<Key, Entity>();
  #snapshot: ReadonlyArray<Entity> = [];
  #selectId: (entity: Entity) => Key;

  constructor(options: EntityStoreOptions<Key, Entity>) {
    super();

    this.#selectId = options.selectId;

    this.getSnapshot = this.getSnapshot.bind(this);
  }

  get(key: Key): Entity | undefined {
    return this.#entities.get(key);
  }

  has(key: Key): boolean {
    return this.#entities.has(key);
  }

  values(): ReadonlyArray<Entity> {
    return Array.from(this.#entities.values());
  }

  select(predicate: EntityStorePredicate<Entity>): Entity[] {
    return this.values().filter(predicate);
  }

  count(predicate?: EntityStorePredicate<Entity>): number {
    if (predicate === undefined) {
      return this.#entities.size;
    }

    return this.values().filter(predicate).length;
  }

  set(entity: Entity): void {
    this.#entities.set(this.#selectId(entity), entity);
  }

  delete(key: Key): boolean {
    return this.#entities.delete(key);
  }

  commit(...events: Event[]): void {
    if (events.length === 0) {
      return;
    }

    this.#snapshot = Object.freeze(this.values());
    const current = Array.from(this.listeners);

    for (const event of events) {
      for (const listener of current) {
        if (!this.listeners.has(listener)) {
          continue;
        }

        try {
          listener(event);
        } catch (error) {
          setTimeout(() => {
            throw error;
          }, 0);
        }
      }
    }
  }

  getSnapshot(): ReadonlyArray<Entity> {
    return this.#snapshot;
  }
}

export { EntityStore };
export type { EntityStoreOptions, EntityStorePredicate };
