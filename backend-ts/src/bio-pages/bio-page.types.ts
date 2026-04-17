export interface BioLink {
  label: string;
  url: string;
}

export interface BioPage {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  links: BioLink[];
  createdAt: string;
  updatedAt: string;
}
