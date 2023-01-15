import { newRxError } from './rx-error';
import { getQueryPlan } from './query-planner';
import { DEFAULT_CHECKPOINT_SCHEMA } from './rx-schema-helper';
import { getMingoQuery } from './rx-query-mingo';
import { DEFAULT_COMPARATOR as mingoSortComparator } from 'mingo/util';
import { objectPathMonad } from './plugins/utils';

/**
 * Most RxStorage implementations use these static functions.
 * But you can use anything that implements the interface,
 * for example if your underlying database already has a query engine.
 */
export var RxStorageDefaultStatics = {
  prepareQuery(schema, mutateableQuery) {
    if (!mutateableQuery.sort) {
      throw newRxError('SNH', {
        query: mutateableQuery
      });
    }

    /**
     * Store the query plan together with the
     * prepared query to save performance.
     */
    var queryPlan = getQueryPlan(schema, mutateableQuery);
    return {
      query: mutateableQuery,
      queryPlan
    };
  },
  getSortComparator(schema, preparedQuery) {
    return getDefaultSortComparator(schema, preparedQuery.query);
  },
  getQueryMatcher(_schema, preparedQuery) {
    var query = preparedQuery.query;
    var mingoQuery = getMingoQuery(query.selector);
    var fun = doc => {
      if (doc._deleted) {
        return false;
      }
      var cursor = mingoQuery.find([doc]);
      var next = cursor.next();
      if (next) {
        return true;
      } else {
        return false;
      }
    };
    return fun;
  },
  checkpointSchema: DEFAULT_CHECKPOINT_SCHEMA
};

/**
 * Default mango query sort comparator.
 * @hotPath
 */
export function getDefaultSortComparator(_schema, query) {
  if (!query.sort) {
    throw newRxError('SNH', {
      query
    });
  }
  var sortParts = [];
  query.sort.forEach(sortBlock => {
    var key = Object.keys(sortBlock)[0];
    var direction = Object.values(sortBlock)[0];
    sortParts.push({
      key,
      direction,
      getValueFn: objectPathMonad(key)
    });
  });
  var fun = (a, b) => {
    for (var i = 0; i < sortParts.length; ++i) {
      var sortPart = sortParts[i];
      var valueA = sortPart.getValueFn(a);
      var valueB = sortPart.getValueFn(b);
      if (valueA !== valueB) {
        var ret = sortPart.direction === 'asc' ? mingoSortComparator(valueA, valueB) : mingoSortComparator(valueB, valueA);
        return ret;
      }
    }
  };
  return fun;
}
//# sourceMappingURL=rx-storage-statics.js.map