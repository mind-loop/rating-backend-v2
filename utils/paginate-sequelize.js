module.exports = async function paginate(
  page = 1,
  limit = 10,
  model,
  where = {}
) {
  const total = await model.count({ where });

  const pageCount = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  const start = total === 0 ? 0 : offset + 1;
  const end = total === 0 ? 0 : Math.min(offset + limit, total);

  const pagination = {
    total,
    page,
    limit,
    pageCount,
    start,
    end,
    offset,
    hasNextPage: page < pageCount,
    hasPrevPage: page > 1,
    nextPage: page < pageCount ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };

  return pagination;
};
