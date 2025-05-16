import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import RichTextEditor from '@/components/rich-text-editor';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Upload, X } from 'lucide-react';
import { Post } from '@shared/schema';

const formSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long' }),
  excerpt: z.string().min(10, { message: 'Excerpt must be at least 10 characters long' }),
  content: z.string().min(20, { message: 'Content must be at least 20 characters long' }),
  featuredImage: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const EditPost = () => {
  const [match, params] = useRoute('/admin/edit-post/:id');
  const [_, navigate] = useLocation();
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate('/');
    toast({
      title: 'Unauthorized',
      description: 'You must be logged in to access this page',
      variant: 'destructive',
    });
    return null;
  }

  // Fetch post data
  const { data: post, isLoading, error } = useQuery<Post>({
    queryKey: [`/api/posts/${params?.id}`],
    queryFn: async () => {
      console.log('Fetching post for edit with ID:', params?.id);
      const response = await fetch(`/api/posts/${params?.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching post:', errorData);
        throw new Error(errorData.message || 'Failed to fetch post');
      }
      const postData = await response.json();
      console.log('Retrieved post:', postData);
      return postData;
    },
    enabled: !!params?.id && !!token,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      excerpt: '',
      content: '',
      featuredImage: '',
    },
  });

  // Set form values when post data is loaded
  useEffect(() => {
    if (post) {
      form.reset({
        title: post.title,
        excerpt: post.excerpt,
        content: typeof post.content === 'string' ? post.content : JSON.stringify(post.content),
        featuredImage: post.featuredImage || '',
      });
      
      if (post.featuredImage) {
        setImagePreview(post.featuredImage);
      }
    }
  }, [post, form]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Only image files are allowed',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      form.setValue('featuredImage', data.url);
      setImagePreview(data.url);
      toast({
        title: 'Image uploaded',
        description: 'Your image has been uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    form.setValue('featuredImage', '');
    setImagePreview(null);
  };

  const updatePostMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!post || !token) throw new Error('Post not found or not authenticated');
      
      console.log('Updating post with ID:', post.id);
      
      // Make a direct fetch request with proper authentication
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating post:', errorData);
        throw new Error(errorData.message || 'Failed to update post');
      }
      
      return response.json();
    },
    onSuccess: (updatedPost) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/posts/${params?.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      
      if (post?.slug) {
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${post.slug}`] });
      }
      
      toast({
        title: 'Post updated',
        description: 'Your post has been updated successfully',
      });
      
      navigate(`/post/${updatedPost.slug}`);
    },
    onError: (error) => {
      console.error('Error updating post:', error);
      toast({
        title: 'Failed to update post',
        description: 'There was an error updating your post. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    updatePostMutation.mutate(values);
  };

  // Check if the route matches and params exist
  if (!match || !params) {
    return navigate('/');
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-50 p-4 rounded-md">
          <h2 className="text-lg font-medium text-red-800">Error loading post</h2>
          <p className="mt-1 text-sm text-red-700">
            The post could not be loaded. Please try again later.
          </p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            Return to homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Post</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/post/${post.slug}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Post
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Excerpt</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Featured Image</FormLabel>
                <div className="flex items-center gap-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-md px-6 py-8 text-center relative">
                    <input 
                      type="file" 
                      id="featuredImage" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                    <div className="flex flex-col items-center">
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                      ) : (
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      )}
                      <p className="text-sm text-gray-500">
                        {isUploading 
                          ? 'Uploading...' 
                          : 'Drag and drop an image, or click to select'}
                      </p>
                    </div>
                  </div>

                  {imagePreview && (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="h-32 w-48 object-cover rounded-md" 
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={removeImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Content</FormLabel>
                    <FormControl>
                      <RichTextEditor 
                        value={field.value} 
                        onChange={field.onChange} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/post/${post.slug}`)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updatePostMutation.isPending}
                >
                  {updatePostMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Post'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
};

export default EditPost;
