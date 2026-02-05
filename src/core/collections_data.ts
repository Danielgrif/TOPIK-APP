export interface UserList {
  id: string;
  title: string;
  is_public: boolean;
  user_id: string;
  icon?: string;
}

export const collectionsState = {
  userLists: [] as UserList[],
  listItems: Object.create(null) as Record<string, Set<number>>,
  currentCollectionFilter: null as string | null,
};

export function setCollectionFilter(filter: string | null) {
  collectionsState.currentCollectionFilter = filter;
}
