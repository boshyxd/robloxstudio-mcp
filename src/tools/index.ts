import { StudioHttpClient } from './studio-client.js';
import { BridgeService } from '../bridge-service.js';

export class RobloxStudioTools {
  private client: StudioHttpClient;

  constructor(bridge: BridgeService) {
    this.client = new StudioHttpClient(bridge);
  }

  // File System Tools
  async getFileTree(path: string = '') {
    const response = await this.client.request('/api/file-tree', { path });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async searchFiles(query: string, searchType: string = 'name') {
    const response = await this.client.request('/api/search-files', { query, searchType });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  // Studio Context Tools
  async getPlaceInfo() {
    const response = await this.client.request('/api/place-info', {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async getServices(serviceName?: string) {
    const response = await this.client.request('/api/services', { serviceName });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async searchObjects(query: string, searchType: string = 'name', propertyName?: string) {
    const response = await this.client.request('/api/search-objects', { 
      query, 
      searchType, 
      propertyName 
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  // Property & Instance Tools
  async getInstanceProperties(instancePath: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_instance_properties');
    }
    const response = await this.client.request('/api/instance-properties', { instancePath });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async getInstanceChildren(instancePath: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for get_instance_children');
    }
    const response = await this.client.request('/api/instance-children', { instancePath });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async searchByProperty(propertyName: string, propertyValue: string) {
    if (!propertyName || !propertyValue) {
      throw new Error('Property name and value are required for search_by_property');
    }
    const response = await this.client.request('/api/search-by-property', { 
      propertyName, 
      propertyValue 
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async getClassInfo(className: string) {
    if (!className) {
      throw new Error('Class name is required for get_class_info');
    }
    const response = await this.client.request('/api/class-info', { className });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  // Project Tools
  async getProjectStructure(path?: string, maxDepth?: number, scriptsOnly?: boolean) {
    const response = await this.client.request('/api/project-structure', { 
      path, 
      maxDepth, 
      scriptsOnly 
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }


  // Property Modification Tools
  async setProperty(instancePath: string, propertyName: string, propertyValue: any) {
    if (!instancePath || !propertyName) {
      throw new Error('Instance path and property name are required for set_property');
    }
    const response = await this.client.request('/api/set-property', { 
      instancePath, 
      propertyName, 
      propertyValue 
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async massSetProperty(paths: string[], propertyName: string, propertyValue: any) {
    if (!paths || paths.length === 0 || !propertyName) {
      throw new Error('Paths array and property name are required for mass_set_property');
    }
    const response = await this.client.request('/api/mass-set-property', { 
      paths, 
      propertyName, 
      propertyValue 
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async massGetProperty(paths: string[], propertyName: string) {
    if (!paths || paths.length === 0 || !propertyName) {
      throw new Error('Paths array and property name are required for mass_get_property');
    }
    const response = await this.client.request('/api/mass-get-property', { 
      paths, 
      propertyName
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  // Object Creation Tools
  async createObject(className: string, parent: string, name?: string) {
    if (!className || !parent) {
      throw new Error('Class name and parent are required for create_object');
    }
    const response = await this.client.request('/api/create-object', { 
      className, 
      parent, 
      name
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async createObjectWithProperties(className: string, parent: string, name?: string, properties?: Record<string, any>) {
    if (!className || !parent) {
      throw new Error('Class name and parent are required for create_object_with_properties');
    }
    const response = await this.client.request('/api/create-object', { 
      className, 
      parent, 
      name, 
      properties 
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async massCreateObjects(objects: Array<{className: string, parent: string, name?: string}>) {
    if (!objects || objects.length === 0) {
      throw new Error('Objects array is required for mass_create_objects');
    }
    const response = await this.client.request('/api/mass-create-objects', { objects });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async massCreateObjectsWithProperties(objects: Array<{className: string, parent: string, name?: string, properties?: Record<string, any>}>) {
    if (!objects || objects.length === 0) {
      throw new Error('Objects array is required for mass_create_objects_with_properties');
    }
    const response = await this.client.request('/api/mass-create-objects-with-properties', { objects });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  async deleteObject(instancePath: string) {
    if (!instancePath) {
      throw new Error('Instance path is required for delete_object');
    }
    const response = await this.client.request('/api/delete-object', { instancePath });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }
}