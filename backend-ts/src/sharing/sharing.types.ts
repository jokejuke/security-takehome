export type GrantedField = 'bio' | 'display_name' | 'links';

export interface Sharing {
  id: string;
  ownerHandle: string;
  sharedHandle: string;
  grantedFields: GrantedField[];
  createdAt: string;
  updatedAt: string;
}
