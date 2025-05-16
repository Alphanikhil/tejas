import { useEffect } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Post as PostType } from '@shared/schema';
import { useAuth } from '@/context/auth-context';
import { formatDate, calculateReadingTime, getImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Post = () => {
  const [match, params] = useRoute('/post/:slug');
  const [_, navigate] = useLocation();
  const { isAuthenticated, token } = useAuth();
  const { toast } = useToast();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: post, isLoading, error } = useQuery<PostType>({
    queryKey: [`/api/posts/${params?.slug}`],
    enabled: !!params?.slug,
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      if (!post || !token) return;
      
      console.log('Deleting post with ID:', post.id);
      
      // Make a direct fetch request with the token in the Authorization header
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete post error:', errorData);
        throw new Error(errorData.message || 'Failed to delete post');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the posts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({
        title: 'Post deleted',
        description: 'Your post has been successfully deleted.',
      });
      navigate('/');
    },
    onError: (error) => {
      console.error('Error deleting post:', error);
      toast({
        title: 'Failed to delete post',
        description: 'There was an error deleting your post. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleDeletePost = () => {
    console.log('Attempting to delete post with ID:', post?.id);
    deletePostMutation.mutate();
  };

  // Check if the route matches and params exist
  if (!match || !params) {
    return navigate('/');
  }

  return (
    <section className="py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mb-8 flex items-center text-primary hover:text-primary/80">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to all posts
        </Link>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <h2 className="text-lg font-medium text-red-800">Error loading post</h2>
            <p className="mt-1 text-sm text-red-700">
              The post could not be loaded. Please try again later.
            </p>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Return to homepage
            </Button>
          </div>
        ) : post ? (
          <article className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Post header image - only show if featuredImage exists */}
            {post.featuredImage && (
              <div className="relative">
                <img 
                  src={post.featuredImage} 
                  alt={post.title} 
                  className="w-full h-72 sm:h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-30"></div>
              </div>
            )}
            
            <div className="p-6 sm:p-10 max-w-4xl mx-auto">
              {/* Post metadata */}
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <span>{formatDate(post.createdAt)}</span>
                <span className="mx-2">•</span>
                <span>{calculateReadingTime(JSON.stringify(post.content))}</span>
              </div>
              
              {/* Post title */}
              <h1 className="text-4xl font-bold text-gray-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">{post.title}</h1>
              
              {/* Post content */}
              <div 
                className="prose prose-lg max-w-none post-content text-gray-700"
                dangerouslySetInnerHTML={{ __html: typeof post.content === 'string' ? post.content : JSON.stringify(post.content) }}
              />

              {/* Admin actions */}
              {isAuthenticated && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex space-x-4">
                    <Button 
                      variant="outline" 
                      className="flex items-center"
                      onClick={() => navigate(`/admin/edit-post/${post.id}`)}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit Post
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="flex items-center">
                          <Trash className="mr-2 h-4 w-4" /> Delete Post
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your post.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeletePost}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deletePostMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              'Delete'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          </article>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-md">
            <h2 className="text-lg font-medium text-yellow-800">Post not found</h2>
            <p className="mt-1 text-sm text-yellow-700">
              The post you're looking for doesn't exist or has been removed.
            </p>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Return to homepage
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Post;
