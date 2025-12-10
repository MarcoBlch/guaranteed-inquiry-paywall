import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

// Allowed MIME types (matching database schema and frontend validation)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB total
const MAX_FILES = 5

interface UploadResponse {
  success: boolean
  urls?: string[]
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Processing file upload request')

    // Parse multipart form data
    const formData = await req.formData()
    const files: File[] = []

    // Collect all files from the form data
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value)
      }
    }

    // Validation: Check number of files
    if (files.length === 0) {
      throw new Error('No files provided')
    }

    if (files.length > MAX_FILES) {
      throw new Error(`Maximum ${MAX_FILES} files allowed, received ${files.length}`)
    }

    // Validation: Check file sizes and types
    let totalSize = 0
    const invalidFiles: string[] = []

    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name}: exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        continue
      }

      // Check MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        invalidFiles.push(`${file.name}: invalid file type (${file.type})`)
        continue
      }

      // Check for suspicious file names
      if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
        invalidFiles.push(`${file.name}: invalid file name`)
        continue
      }

      totalSize += file.size
    }

    // Check total size
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new Error(`Total file size exceeds 50MB limit (${(totalSize / 1024 / 1024).toFixed(2)}MB)`)
    }

    // If any files are invalid, reject the entire upload
    if (invalidFiles.length > 0) {
      throw new Error(`Invalid files: ${invalidFiles.join(', ')}`)
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Upload files to storage
    const uploadedUrls: string[] = []
    const uploadErrors: string[] = []

    for (const file of files) {
      try {
        // Generate unique file name with timestamp and random UUID
        const timestamp = Date.now()
        const randomId = crypto.randomUUID()
        const fileExt = file.name.split('.').pop() || 'bin'
        const sanitizedFileName = file.name
          .replace(/[^a-zA-Z0-9.-]/g, '_')
          .substring(0, 100) // Limit filename length
        const uniqueFileName = `${timestamp}-${randomId}-${sanitizedFileName}`

        console.log(`Uploading file: ${file.name} as ${uniqueFileName}`)

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('message-attachments')
          .upload(uniqueFileName, uint8Array, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error(`Failed to upload ${file.name}:`, error)
          uploadErrors.push(`${file.name}: ${error.message}`)
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(data.path)

        uploadedUrls.push(urlData.publicUrl)
        console.log(`Successfully uploaded: ${file.name} -> ${urlData.publicUrl}`)

      } catch (fileError: any) {
        console.error(`Error uploading file ${file.name}:`, fileError)
        uploadErrors.push(`${file.name}: ${fileError.message}`)
      }
    }

    // Check if all uploads failed
    if (uploadedUrls.length === 0 && uploadErrors.length > 0) {
      throw new Error(`All uploads failed: ${uploadErrors.join(', ')}`)
    }

    // Return partial success if some uploads failed
    if (uploadErrors.length > 0) {
      console.warn('Partial upload success:', {
        successful: uploadedUrls.length,
        failed: uploadErrors.length,
        errors: uploadErrors
      })
    }

    const response: UploadResponse = {
      success: true,
      urls: uploadedUrls
    }

    console.log(`Upload complete: ${uploadedUrls.length} files uploaded successfully`)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('Error processing file upload:', error)

    const errorResponse: UploadResponse = {
      success: false,
      error: error.message || 'Failed to upload files'
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
