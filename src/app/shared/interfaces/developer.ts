export interface Developer {
  _id?: string      
  name: string
  email: string
  role?: 'admin' | 'developer'   
  createdAt?: string
  updatedAt?: string
}
